import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSession, sameCredential } from "@/lib/auth/admin-session";
import { adminConfig, adminCookieName, adminSessionSeconds, sameAdminOrigin } from "@/lib/auth/admin-session-shared";

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
  if (!config) return denied("La connexion administrateur doit etre configuree sur le serveur.", 503);
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
  const matches = sameCredential(parsed.data.email, config.email) && sameCredential(parsed.data.password, config.password);
  if (!matches) {
    if (attempts.size >= 1000 && !attempts.has(key)) attempts.delete(attempts.keys().next().value!);
    attempts.set(key, previous && previous.until > now ? { ...previous, failures: previous.failures + 1 } : { failures: 1, until: now + 10 * 60_000 });
    return denied("Identifiant ou mot de passe incorrect.", 401);
  }
  attempts.delete(key);
  const response = NextResponse.json({ ok: true }, { headers: noStore });
  response.cookies.set(adminCookieName, createAdminSession(), { ...cookieOptions(request), maxAge: adminSessionSeconds });
  return response;
}

export async function DELETE(request: NextRequest) {
  if (!sameAdminOrigin(request)) return denied("Origine de la requete refusee.", 403);
  const response = NextResponse.json({ ok: true }, { headers: noStore });
  response.cookies.set(adminCookieName, "", { ...cookieOptions(request), maxAge: 0 });
  return response;
}
