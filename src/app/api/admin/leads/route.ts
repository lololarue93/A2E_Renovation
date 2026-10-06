import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";
import { leadStatuses } from "@/lib/admin/lead-status";
import { crmActivityKinds, crmContactSchema, crmDateSchema, crmDueFilters, crmDueWhere, crmEditableContactSchema, crmNextActionDate } from "@/lib/admin/crm";

export const dynamic = "force-dynamic";
const followupFields = { nextAction: z.string().trim().max(500).nullable().optional(), nextActionDate: crmDateSchema.nullable().optional() };
const updateSchema = z.object({
  id: z.string().min(1).max(100), status: z.enum(leadStatuses), previousStatus: z.enum(leadStatuses),
  expectedVersion: z.number().int().nonnegative().optional(), contact: crmEditableContactSchema.optional(),
  ...followupFields, note: z.string().trim().max(2000).optional(),
  activity: z.object({ kind: z.enum(crmActivityKinds), note: z.string().trim().min(1).max(2000), occurredAt: z.string().datetime({ offset: true }).refine(value => new Date(value).getTime() <= Date.now() + 60_000 && new Date(value).getUTCFullYear() >= 2000, "La date de l’échange ne peut pas être future.") }).strict().optional()
}).strict().superRefine((value, context) => {
  if (value.nextAction !== undefined || value.nextActionDate !== undefined) {
    if (value.nextAction === undefined || value.nextActionDate === undefined || (!!value.nextAction !== !!value.nextActionDate)) context.addIssue({ code: "custom", path: ["nextActionDate"], message: "Précisez une action et sa date, ou effacez les deux." });
  }
  if ((value.contact || value.nextAction !== undefined || value.activity) && value.expectedVersion === undefined) context.addIssue({ code: "custom", path: ["expectedVersion"], message: "Rechargez la version du dossier avant modification." });
});
const createSchema = z.object({ requestId: z.string().uuid(), contact: crmContactSchema, nextAction: z.string().trim().max(500).nullable(), nextActionDate: crmDateSchema.nullable(), note: z.string().trim().max(2000).default("") }).strict().refine(value => !!value.nextAction === !!value.nextActionDate, "Précisez une action et sa date, ou laissez les deux vides.");
const failure = (error: string, status = 503) => NextResponse.json({ error }, { status });

export async function GET(request: NextRequest) {
  const denied = requireAdmin(request); if (denied) return denied;
  const params = request.nextUrl.searchParams;
  const search = (params.get("search") ?? "").trim().slice(0, 100);
  const status = params.get("status"), due = params.get("due"), source = params.get("source"), consent = params.get("consent") ?? "all";
  if (status && !leadStatuses.includes(status as typeof leadStatuses[number])) return failure("Statut invalide.", 400);
  if (due && !crmDueFilters.includes(due as typeof crmDueFilters[number])) return failure("Filtre de relance invalide.", 400);
  if (!["yes", "no", "all"].includes(consent) || (source && source.length > 80)) return failure("Filtre de contact ou d’origine invalide.", 400);
  const rawPage = Number(params.get("page") ?? 1);
  const page = Number.isInteger(rawPage) && rawPage > 0 ? Math.min(rawPage, 10000) : 1;
  const id = params.get("id");
  const base: Prisma.LeadWhereInput = {
    ...(consent === "all" ? {} : { consent: consent === "yes" }),
    ...(search ? { OR: ["name", "company", "email", "phone", "city", "typeProjet"].map(field => ({ [field]: { contains: search, mode: "insensitive" } })) } : {})
  };
  const where: Prisma.LeadWhereInput = { AND: [base, ...(id ? [{ id: id.slice(0, 100) }] : []), ...(status ? [{ status: status as typeof leadStatuses[number] }] : []), ...(source ? [{ sourceLead: source }] : []), ...(due ? [crmDueWhere(due as typeof crmDueFilters[number])] : [])] };
  try {
    const [leads, total, sources, overdue, today, unscheduled] = await Promise.all([
      prisma.lead.findMany({ where, orderBy: due && due !== "unscheduled" ? [{ nextActionAt: "asc" }, { createdAt: "desc" }] : { createdAt: "desc" }, skip: (page - 1) * 20, take: 20, include: {
        project: { select: { type: true, city: true, postalCode: true, surface: true, details: true } },
        estimates: { orderBy: { createdAt: "desc" }, take: 1, include: { lines: true } },
        activities: { orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }], take: id ? 100 : 5 }
      } }),
      prisma.lead.count({ where }),
      prisma.lead.groupBy({ by: ["sourceLead"], where: base, _count: { _all: true }, orderBy: { sourceLead: "asc" } }),
      ...(["overdue", "today", "unscheduled"] as const).map(filter => prisma.lead.count({ where: { AND: [base, crmDueWhere(filter)] } }))
    ]);
    const notes = leads.length ? await prisma.auditLog.findMany({ where: { entity: "Lead", entityId: { in: leads.map(lead => lead.id) }, action: "lead.note_added" }, orderBy: { createdAt: "desc" }, take: 200, select: { id: true, entityId: true, payload: true, createdAt: true } }) : [];
    return NextResponse.json({ leads: leads.map(lead => ({ ...lead, notes: notes.filter(note => note.entityId === lead.id).map(note => ({ id: note.id, createdAt: note.createdAt, text: note.payload && typeof note.payload === "object" && !Array.isArray(note.payload) && typeof note.payload.note === "string" ? note.payload.note : "" })) })), total, page, pageSize: 20, sources: sources.map(item => ({ key: item.sourceLead, count: item._count._all })), stats: { overdue, today, unscheduled }, activityLimit: id ? 100 : 5 }, { headers: { "Cache-Control": "no-store" } });
  } catch { return failure("La base ou sa migration CRM est indisponible. Les dossiers n’ont pas pu être chargés."); }
}

export async function POST(request: NextRequest) {
  const denied = requireAdmin(request); if (denied) return denied;
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return failure("Renseignez un nom ou une entreprise, un email ou téléphone valide, le type de projet et une origine. Vérifiez l’action et sa date.", 400);
  const { contact, requestId, nextAction, nextActionDate, note } = parsed.data;
  const id = `crm-${requestId}`;
  const creationFingerprint = createHash("sha256").update(JSON.stringify({ contact, nextAction, nextActionDate, note })).digest("hex");
  try {
    const result = await prisma.$transaction(async tx => {
      const existing = await tx.lead.findUnique({ where: { id } });
      if (existing) {
        const receipt = await tx.auditLog.findFirst({ where: { entity: "Lead", entityId: id, action: "lead.manual_created" }, select: { payload: true } });
        const payload = receipt?.payload;
        const identical = payload && typeof payload === "object" && !Array.isArray(payload) && payload.creationFingerprint === creationFingerprint;
        return { state: identical ? "existing" as const : "conflict" as const, lead: existing };
      }
      const created = await tx.lead.create({ data: { id, ...contact, name: contact.name || contact.company, company: contact.company || null, city: contact.city || null, nextAction: nextAction || null, nextActionAt: nextActionDate ? crmNextActionDate(nextActionDate) : null } });
      if (note) await tx.leadActivity.create({ data: { leadId: id, kind: "note", note, occurredAt: new Date(), actor: process.env.ADMIN_EMAIL } });
      await tx.auditLog.create({ data: { actor: process.env.ADMIN_EMAIL, action: "lead.manual_created", entity: "Lead", entityId: id, payload: { source: contact.sourceLead, consent: contact.consent, creationFingerprint } } });
      return { state: "created" as const, lead: created };
    }, { isolationLevel: "Serializable" });
    if (result.state === "conflict") return NextResponse.json({ error: "La première création a déjà été enregistrée avec une saisie différente. Votre nouvelle saisie est conservée ; reprenez-la dans le dossier existant.", existingLeadId: result.lead.id }, { status: 409 });
    return NextResponse.json({ ok: true, lead: result.lead }, { status: result.state === "created" ? 201 : 200 });
  } catch { return failure("Le prospect n’a pas pu être enregistré. Votre saisie peut être conservée puis renvoyée sans créer un second dossier."); }
}

export async function PATCH(request: NextRequest) {
  const denied = requireAdmin(request); if (denied) return denied;
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return failure("Vérifiez les coordonnées, la prochaine action et la date de l’échange. Une note contient au maximum 2 000 caractères.", 400);
  const { id, status, previousStatus, expectedVersion, contact, nextAction, nextActionDate, note, activity } = parsed.data;
  try {
    const result = await prisma.$transaction(async tx => {
      const current = await tx.lead.findUnique({ where: { id }, select: { status: true, crmVersion: true } });
      if (!current) return { state: "missing" as const };
      const updated = await tx.lead.updateMany({ where: { id, status: previousStatus, ...(expectedVersion === undefined ? {} : { crmVersion: expectedVersion }) }, data: {
        status, crmVersion: { increment: 1 }, ...(contact ? { ...contact, name: contact.name || contact.company, company: contact.company || null, city: contact.city || null } : {}),
        ...(nextAction === undefined ? {} : { nextAction: nextAction || null, nextActionAt: nextActionDate ? crmNextActionDate(nextActionDate) : null })
      } });
      if (!updated.count) return { state: "conflict" as const };
      if (status !== previousStatus) await tx.auditLog.create({ data: { actor: process.env.ADMIN_EMAIL, action: "lead.status_updated", entity: "Lead", entityId: id, payload: { previousStatus, status } } });
      if (contact || nextAction !== undefined) await tx.auditLog.create({ data: { actor: process.env.ADMIN_EMAIL, action: "lead.crm_updated", entity: "Lead", entityId: id, payload: { nextActionDate, contactUpdated: !!contact } } });
      if (note) {
        await tx.auditLog.create({ data: { actor: process.env.ADMIN_EMAIL, action: "lead.note_added", entity: "Lead", entityId: id, payload: { note } } });
        await tx.leadActivity.create({ data: { leadId: id, kind: "note", note, occurredAt: new Date(), actor: process.env.ADMIN_EMAIL } });
      }
      const savedActivity = activity ? await tx.leadActivity.create({ data: { leadId: id, kind: activity.kind, note: activity.note, occurredAt: new Date(activity.occurredAt), actor: process.env.ADMIN_EMAIL } }) : null;
      if (savedActivity) await tx.auditLog.create({ data: { actor: process.env.ADMIN_EMAIL, action: "lead.activity_recorded", entity: "Lead", entityId: id, payload: { activityId: savedActivity.id, kind: activity!.kind } } });
      return { state: "saved" as const, crmVersion: (current.crmVersion ?? 0) + 1, activityId: savedActivity?.id };
    });
    if (result.state === "missing") return failure("Ce dossier n’existe plus.", 404);
    if (result.state === "conflict") return failure("Ce dossier a été modifié depuis son ouverture. Votre saisie est conservée ; rechargez le dossier avant de la réappliquer.", 409);
    return NextResponse.json({ ok: true, id, status, crmVersion: result.crmVersion, activityId: result.activityId });
  } catch { return failure("Enregistrement non confirmé. Votre saisie est conservée ; rechargez le dossier avant de réessayer."); }
}
