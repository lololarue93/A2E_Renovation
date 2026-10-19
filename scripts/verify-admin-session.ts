import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { middleware } from "../middleware";
import { requireAdmin } from "../src/lib/auth/require-admin";
import { createAdminSession, validAdminSession } from "../src/lib/auth/admin-session";
import { adminCookieName, adminSessionSeconds, safeAdminNext } from "../src/lib/auth/admin-session-shared";
import { POST, DELETE } from "../src/app/api/auth/admin/route";

async function main() {
  const previous = { ADMIN_EMAIL: process.env.ADMIN_EMAIL, ADMIN_PASSWORD: process.env.ADMIN_PASSWORD, AUTH_SECRET: process.env.AUTH_SECRET, NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL };
  const base = "https://a2e.example.test";
  const login = (password: string, extra: Record<string, string> = {}) => new NextRequest(`${base}/api/auth/admin`, { method: "POST", headers: { origin: base, "content-type": "application/json", ...extra }, body: JSON.stringify({ email: "equipe@example.test", password }) });
  try {
    delete process.env.ADMIN_EMAIL; delete process.env.ADMIN_PASSWORD;
    assert.equal((await POST(login("fixture"))).status, 503);
    assert.equal((await middleware(new NextRequest(`${base}/admin/connexion`))).headers.get("x-middleware-next"), "1");
    process.env.ADMIN_EMAIL = "equipe@example.test"; process.env.ADMIN_PASSWORD = "fixture-longue-ete-€"; process.env.AUTH_SECRET = "fixture-auth-secret-long-only-for-tests"; process.env.NEXT_PUBLIC_SITE_URL = base;
    const protectedPage = await middleware(new NextRequest(`${base}/admin/cotations?q=local`));
    assert.equal(protectedPage.status, 307);
    assert.equal(new URL(protectedPage.headers.get("location")!).pathname, "/admin/connexion");
    assert.equal(new URL(protectedPage.headers.get("location")!).searchParams.get("next"), "/admin/cotations?q=local");
    const response = await POST(login(process.env.ADMIN_PASSWORD));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    const setCookie = response.headers.get("set-cookie")!;
    for (const flag of ["HttpOnly", "Secure", "SameSite=strict", "Path=/", `Max-Age=${adminSessionSeconds}`]) assert.ok(setCookie.toLowerCase().includes(flag.toLowerCase()));
    assert.ok(!setCookie.includes(process.env.ADMIN_PASSWORD));
    const token = response.cookies.get(adminCookieName)!.value;
    assert.ok(validAdminSession(token));
    const authenticated = new NextRequest(`${base}/api/admin/pricing`, { headers: { cookie: `${adminCookieName}=${token}` } });
    assert.equal(requireAdmin(authenticated), null);
    assert.equal((await middleware(authenticated)).headers.get("x-middleware-next"), "1", "Signature Node reconnue par le middleware WebCrypto");
    const forged = token.slice(0, -1) + (token.endsWith("a") ? "b" : "a");
    assert.equal(validAdminSession(forged), false);
    assert.equal(requireAdmin(new Request(`${base}/api/admin/leads`, { headers: { cookie: `${adminCookieName}=${forged}` } }))?.status, 401);
    assert.equal(validAdminSession(createAdminSession(Date.now() - adminSessionSeconds * 1000)), false, "Session expiree refusee");
    assert.equal(validAdminSession(createAdminSession(Date.now() + 120_000)), false, "Date artificiellement lointaine refusee");
    const mutation = (origin?: string) => new Request(`${base}/api/admin/leads`, { method: "PATCH", headers: { cookie: `${adminCookieName}=${token}`, ...(origin ? { origin } : {}) } });
    assert.equal(requireAdmin(mutation(base)), null);
    assert.equal(requireAdmin(mutation("https://other.example"))?.status, 403);
    assert.equal(requireAdmin(mutation())?.status, 403);
    process.env.ADMIN_PASSWORD += "-rotation";
    assert.equal(validAdminSession(token), false, "Rotation identifiants invalide les sessions");
    process.env.ADMIN_PASSWORD = "fixture-longue-ete-€";
    for (const target of ["//evil.example", "https://evil.example", "/admin/../../outside", "/admin/connexion", "/admin\\evil"]) assert.equal(safeAdminNext(target), "/admin");
    assert.equal(safeAdminNext("/admin/cotations?lead=fixture#details"), "/admin/cotations?lead=fixture#details");
    assert.equal((await POST(login("wrong", { origin: "https://other.example" }))).status, 403);
    assert.equal((await POST(login("wrong", { "content-length": "5000" }))).status, 413);
    for (let index = 0; index < 5; index++) assert.equal((await POST(login("wrong", { "x-forwarded-for": "192.0.2.92" }))).status, 401);
    const limited = await POST(login("wrong", { "x-forwarded-for": "192.0.2.92" }));
    assert.equal(limited.status, 429); assert.ok(Number(limited.headers.get("retry-after")) > 0);
    const logout = await DELETE(new NextRequest(`${base}/api/auth/admin`, { method: "DELETE", headers: { origin: base } }));
    assert.equal(logout.status, 200); assert.equal(logout.cookies.get(adminCookieName)?.value, ""); assert.ok(logout.headers.get("set-cookie")?.includes("Max-Age=0"));
    assert.equal((await DELETE(new NextRequest(`${base}/api/auth/admin`, { method: "DELETE", headers: { origin: "https://other.example" } }))).status, 403);
    console.log("PASS : login, cookie signe Node/WebCrypto, expiration, falsification, rotation, redirection locale, protections origine, limites et deconnexion.");
  } finally {
    for (const [key, value] of Object.entries(previous)) if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
