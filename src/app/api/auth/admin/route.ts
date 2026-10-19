import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSession, createDatabaseSession, sameCredential } from "@/lib/auth/admin-session";
import { adminConfig, adminCookieName, adminSessionSeconds, sameAdminOrigin, adminSessionKey } from "@/lib/auth/admin-session-shared";
import { prisma } from "@/lib/db/prisma";
import bcrypt from "bcryptjs";
import { isAdminRole } from "@/lib/auth/permissions";

export const runtime = "nodejs";
const attempts = new Map<string, { failures: number; until: number }>();
const noStore = { "Cache-Control": "no-store" };
const schema = z.object({ email: z.string().trim().min(1).max(254), password: z.string().min(1).max(1024) });
const denied = (error: string, status: number) => NextResponse.json({ error }, { status, headers: noStore });

function cookieOptions(request: Request) {
  const url = new URL(request.url);
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  return { httpOnly: true, sameSite: "strict" as const, path: "/", secure: !loopback && (url.protocol === "https:" || process.env.NEXT_PUBLIC_SITE_URL?.startsWith("https:") === true) };
}

export async function POST(request: NextRequest) {
  if (!sameAdminOrigin(request)) return denied("Origine de la requete refusee.", 403);
  const config = adminConfig();
  if (!config && !(process.env.DATABASE_URL && adminSessionKey())) return denied("La connexion administrateur doit etre configuree sur le serveur.", 503);
  if (Number(request.headers.get("content-length") ?? 0) > 4096) return denied("Formulaire trop volumineux.", 413);
  const body = await request.text();
  if (new TextEncoder().encode(body).length > 4096) return denied("Formulaire trop volumineux.", 413);
  let parsed;
  try { parsed = schema.safeParse(JSON.parse(body)); } catch { return denied("Verifiez les champs du formulaire.", 400); }
  if (!parsed.success) return denied("Verifiez les champs du formulaire.", 400);
  const peer = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  const key = createHash("sha256").update(peer).digest("hex");
  const now = Date.now(), previous = attempts.get(key);
  if (previous && previous.until > now && previous.failures >= 5) return NextResponse.json({ error: "Trop de tentatives. Reessayez dans quelques minutes." }, { status: 429, headers: { ...noStore, "Retry-After": String(Math.ceil((previous.until - now) / 1000)) } });
  let token: string | null = null;
  const mainEmail = !!config && parsed.data.email.toLowerCase() === config.email.toLowerCase();
  if (mainEmail && sameCredential(parsed.data.password, config!.password)) token = createAdminSession();
  else if (!mainEmail && process.env.DATABASE_URL) {
    try {
      const user = await prisma.user.findFirst({ where: { email: { equals: parsed.data.email.trim().toLowerCase(), mode: "insensitive" } } });
      if (user && user.active && isAdminRole(user.role) && Buffer.byteLength(parsed.data.password, "utf8") <= 72 && await bcrypt.compare(parsed.data.password, user.passwordHash)) token = createDatabaseSession(user);
    } catch { return denied("Connexion temporairement indisponible.", 503); }
  }
  if (!token) {
    if (attempts.size >= 1000 && !attempts.has(key)) attempts.delete(attempts.keys().next().value!);
    attempts.set(key, previous && previous.until > now ? { ...previous, failures: previous.failures + 1 } : { failures: 1, until: now + 10 * 60_000 });
    return denied("Identifiant ou mot de passe incorrect.", 401);
  }
  attempts.delete(key);
  const response = NextResponse.json({ ok: true }, { headers: noStore });
  response.cookies.set(adminCookieName, token, { ...cookieOptions(request), maxAge: adminSessionSeconds });
  return response;
}

export async function DELETE(request: NextRequest) {
  if (!sameAdminOrigin(request)) return denied("Origine de la requete refusee.", 403);
  const response = NextResponse.json({ ok: true }, { headers: noStore });
  response.cookies.set(adminCookieName, "", { ...cookieOptions(request), maxAge: 0 });
  return response;
}
