import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin, getRequestIdentity, getRequestActor } from "@/lib/auth/require-admin";
import { adminRoles, roleLabels } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie, Authorization" };
const password = z.string().min(12).max(72).refine(value => Buffer.byteLength(value, "utf8") <= 72, "Le mot de passe depasse 72 octets.");
const fields = { name: z.string().trim().min(2).max(100), email: z.string().trim().toLowerCase().email().max(160), role: z.enum(adminRoles) };
const createSchema = z.object({ ...fields, password }).strict();
const updateSchema = z.object({ id: z.string().min(1).max(100), expectedVersion: z.number().int().min(0), name: fields.name.optional(), email: fields.email.optional(), role: fields.role.optional(), active: z.boolean().optional(), password: password.optional() }).strict().refine(value => [value.name, value.email, value.role, value.active, value.password].some(field => field !== undefined), "Aucun changement fourni.");
const select = { id: true, name: true, email: true, role: true, active: true, sessionVersion: true, createdAt: true, updatedAt: true } as const;
type SelectedUser = { id: string; name: string; email: string; role: string; active: boolean; sessionVersion: number; createdAt: Date; updatedAt: Date };
const serverManaged = (email: string) => !!process.env.ADMIN_EMAIL && email.toLowerCase() === process.env.ADMIN_EMAIL.trim().toLowerCase();
const summary = (user: SelectedUser) => { const { sessionVersion, ...safe } = user; return { ...safe, version: sessionVersion, protected: serverManaged(user.email) }; };
class AccountConflict extends Error {}
async function readBody(request: Request) {
  const body = await request.text();
  if (Buffer.byteLength(body, "utf8") > 6000) throw new Error("body");
  return JSON.parse(body) as unknown;
}
function failure(error: unknown) {
  if (error instanceof AccountConflict) return NextResponse.json({ error: error.message }, { status: 409, headers: noStore });
  const code = error && typeof error === "object" && "code" in error ? error.code : "";
  if (code === "P2002") return NextResponse.json({ error: "Cette adresse email appartient deja a un compte." }, { status: 409, headers: noStore });
  if (code === "P2034") return NextResponse.json({ error: "Une autre modification a eu lieu. Rechargez avant de reessayer." }, { status: 409, headers: noStore });
  return NextResponse.json({ error: "Les comptes ne peuvent pas etre enregistres actuellement." }, { status: 503, headers: noStore });
}
export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request, "users:manage"); if (denied) return denied;
  try {
    const users = await prisma.user.findMany({ orderBy: [{ createdAt: "asc" }, { id: "asc" }], select });
    return NextResponse.json({ users: users.map(summary), roles: adminRoles.map(value => ({ value, label: roleLabels[value] })) }, { headers: noStore });
  } catch { return NextResponse.json({ error: "Liste des comptes indisponible." }, { status: 503, headers: noStore }); }
}
export async function POST(request: NextRequest) {
  const denied = await requireAdmin(request, "users:manage"); if (denied) return denied;
  let parsed;
  try { parsed = createSchema.safeParse(await readBody(request)); } catch { return NextResponse.json({ error: "Formulaire invalide." }, { status: 400, headers: noStore }); }
  if (!parsed.success) return NextResponse.json({ error: "Verifiez le nom, l'email, le role et le mot de passe (12 caracteres minimum, 72 octets maximum)." }, { status: 400, headers: noStore });
  if (serverManaged(parsed.data.email)) return NextResponse.json({ error: "Le compte principal est configure sur le serveur." }, { status: 409, headers: noStore });
  const actor = await getRequestActor(request);
  try {
    const { password: plain, ...data } = parsed.data;
    const passwordHash = await bcrypt.hash(plain, 12);
    const saved = await prisma.$transaction(async tx => {
      const user = await tx.user.create({ data: { ...data, passwordHash }, select });
      await tx.auditLog.create({ data: { actor, action: "user.created", entity: "User", entityId: user.id, payload: { email: user.email, role: user.role } } });
      return user;
    });
    return NextResponse.json({ user: summary(saved) }, { status: 201, headers: noStore });
  } catch (error) { return failure(error); }
}
export async function PATCH(request: NextRequest) {
  const denied = await requireAdmin(request, "users:manage"); if (denied) return denied;
  let parsed;
  try { parsed = updateSchema.safeParse(await readBody(request)); } catch { return NextResponse.json({ error: "Formulaire invalide." }, { status: 400, headers: noStore }); }
  if (!parsed.success) return NextResponse.json({ error: "Modification invalide. Rechargez la liste et verifiez les champs." }, { status: 400, headers: noStore });
  const identity = (await getRequestIdentity(request))!, actor = identity.email;
  const { id, expectedVersion, password: plain, ...changes } = parsed.data;
  const passwordHash = plain ? await bcrypt.hash(plain, 12) : undefined;
  try {
    const saved = await prisma.$transaction(async tx => {
      // Deterministic row locks serialize account changes and preserve the last administrator.
      await tx.$queryRaw`SELECT "id" FROM "User" ORDER BY "id" FOR UPDATE`;
      const current = await tx.user.findUnique({ where: { id }, select });
      if (!current) throw new AccountConflict("Compte introuvable. Rechargez la liste.");
      if (serverManaged(current.email) || (changes.email && serverManaged(changes.email))) throw new AccountConflict("Le compte principal est configure sur le serveur et ne se modifie pas ici.");
      if (current.sessionVersion !== expectedVersion) throw new AccountConflict("Ce compte a deja ete modifie. Rechargez avant de reessayer.");
      if (changes.active === false && (identity.id === id || identity.email.toLowerCase() === current.email.toLowerCase())) throw new AccountConflict("Vous ne pouvez pas desactiver votre propre compte.");
      if (current.active && current.role === "admin" && (changes.active === false || (changes.role !== undefined && changes.role !== "admin"))) {
        const count = await tx.user.count({ where: { active: true, role: "admin" } });
        if (count <= 1) throw new AccountConflict("Le dernier administrateur actif doit etre conserve.");
      }
      const user = await tx.user.update({ where: { id }, data: { ...changes, ...(passwordHash ? { passwordHash } : {}), sessionVersion: { increment: 1 } }, select });
      await tx.auditLog.create({ data: { actor, action: plain ? "user.password_reset" : "user.updated", entity: "User", entityId: id, payload: { email: user.email, role: user.role, active: user.active, changedFields: Object.keys(changes), sessionsRevoked: true } } });
      return user;
    });
    return NextResponse.json({ user: summary(saved), sessionRevoked: true }, { headers: noStore });
  } catch (error) { return failure(error); }
}
