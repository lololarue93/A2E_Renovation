import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import { prisma } from "../src/lib/db/prisma";
import { POST as login } from "../src/app/api/auth/admin/route";
import { GET as me } from "../src/app/api/auth/me/route";
import { GET, POST, PATCH } from "../src/app/api/admin/users/route";
import { createDatabaseSession, validAdminSession } from "../src/lib/auth/admin-session";
import { adminCookieName } from "../src/lib/auth/admin-session-shared";
import { getRequestActor, getServerIdentity, requireAdmin } from "../src/lib/auth/require-admin";
import { adminMiddleware } from "../src/lib/auth/admin-middleware";
import { hasPermission, type AdminRole } from "../src/lib/auth/permissions";

type User = { id: string; name: string; email: string; passwordHash: string; role: AdminRole; active: boolean; sessionVersion: number; createdAt: Date; updatedAt: Date };
type Args = { where?: { id?: string; email?: { equals: string }; active?: boolean; role?: string }; select?: Record<string, boolean>; data?: Record<string, unknown> };
async function main() {
  const variables = ["ADMIN_EMAIL", "ADMIN_PASSWORD", "AUTH_SECRET", "DATABASE_URL", "NEXT_PUBLIC_SITE_URL"];
  const previous = new Map(variables.map(key => [key, process.env[key]]));
  const original = { findUnique: prisma.user.findUnique, findFirst: prisma.user.findFirst, findMany: prisma.user.findMany, create: prisma.user.create, update: prisma.user.update, count: prisma.user.count, audit: prisma.auditLog.create, transaction: prisma.$transaction, query: prisma.$queryRaw };
  const users = new Map<string, User>(), events: Record<string, unknown>[] = [];
  let sequence = 0, locks = 0;
  const origin = "https://a2e.example.test";
  const select = (user: User | undefined, fields?: Record<string, boolean>) => !user ? null : fields ? Object.fromEntries(Object.keys(fields).filter(key => fields[key]).map(key => [key, user[key as keyof User]])) : { ...user };
  const tokenFor = (id: string) => createDatabaseSession(users.get(id)!);
  const request = (path: string, method = "GET", body?: unknown, token?: string) => new NextRequest(`${origin}${path}`, { method, headers: { origin, "content-type": "application/json", ...(token ? { cookie: `${adminCookieName}=${token}` } : { authorization: `Basic ${Buffer.from("main@example.test:fixture-environment-only").toString("base64")}` }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  try {
    Object.assign(process.env, { ADMIN_EMAIL: "main@example.test", ADMIN_PASSWORD: "fixture-environment-only", AUTH_SECRET: "fixture-secret-for-account-tests-only", DATABASE_URL: "postgresql://test-only.invalid/test", NEXT_PUBLIC_SITE_URL: origin });
    const passwordHash = await bcrypt.hash("fixture-password", 4);
    for (const [id, role] of [["admin-one", "admin"], ["associate-one", "associate"], ["secretary-one", "secretary"], ["auditor-one", "auditor"]] as const) users.set(id, { id, name: id, email: `${id}@example.test`, role, passwordHash, active: true, sessionVersion: 0, createdAt: new Date(), updatedAt: new Date() });
    users.set("main-one", { ...users.get("admin-one")!, id: "main-one", email: "main@example.test", active: false });
    prisma.user.findUnique = (async (args: Args) => select(users.get(args.where?.id || ""), args.select)) as unknown as typeof prisma.user.findUnique;
    prisma.user.findFirst = (async (args: Args) => select([...users.values()].find(user => user.email.toLowerCase() === args.where?.email?.equals.toLowerCase()), args.select)) as unknown as typeof prisma.user.findFirst;
    prisma.user.findMany = (async (args: Args) => [...users.values()].map(user => select(user, args.select))) as unknown as typeof prisma.user.findMany;
    prisma.user.count = (async (args: Args) => [...users.values()].filter(user => (args.where?.active === undefined || args.where.active === user.active) && (!args.where?.role || args.where.role === user.role)).length) as unknown as typeof prisma.user.count;
    prisma.user.create = (async (args: Args) => { if ([...users.values()].some(user => user.email.toLowerCase() === String(args.data?.email).toLowerCase())) throw { code: "P2002" }; const id = `new-user-${++sequence}`; const user = { id, active: true, sessionVersion: 0, createdAt: new Date(), updatedAt: new Date(), ...args.data } as User; users.set(id, user); return select(user, args.select); }) as unknown as typeof prisma.user.create;
    prisma.user.update = (async (args: Args) => { const user = users.get(args.where!.id!)!; Object.assign(user, args.data, { sessionVersion: user.sessionVersion + 1, updatedAt: new Date() }); return select(user, args.select); }) as unknown as typeof prisma.user.update;
    prisma.auditLog.create = (async (args: { data: Record<string, unknown> }) => { events.push(args.data); return args.data; }) as unknown as typeof prisma.auditLog.create;
    prisma.$queryRaw = (async () => { locks++; return [...users.keys()].map(id => ({ id })); }) as typeof prisma.$queryRaw;
    prisma.$transaction = (async (fn: (client: typeof prisma) => Promise<unknown>) => fn(prisma)) as unknown as typeof prisma.$transaction;

    const secretaryToken = tokenFor("secretary-one"), auditorToken = tokenFor("auditor-one"), associateToken = tokenFor("associate-one"), adminToken = tokenFor("admin-one");
    assert.equal((await getServerIdentity(secretaryToken))?.role, "secretary");
    assert.equal((await adminMiddleware(request("/api/admin/leads", "GET", undefined, secretaryToken))).headers.get("x-middleware-next"), "1", "La signature DB Node est reconnue au passage Edge");
    assert.equal(await getRequestActor(request("/api/admin/leads", "GET", undefined, secretaryToken)), "secretary-one@example.test");
    const identityResponse = await me(request("/api/auth/me", "GET", undefined, secretaryToken)); assert.equal(identityResponse.status, 200); assert.ok(identityResponse.headers.get("cache-control")?.includes("no-store"));
    const identityBody = await identityResponse.json(); assert.equal(identityBody.user.source, "database"); assert.ok(identityBody.user.permissions.includes("mail:send")); assert.ok(!JSON.stringify(identityBody).includes("passwordHash"));
    for (const [path, method, token, status] of [
      ["/api/admin/leads", "PATCH", secretaryToken, undefined], ["/api/admin/cotations", "PUT", secretaryToken, undefined], ["/api/admin/pricing", "GET", secretaryToken, undefined], ["/api/admin/pricing", "PUT", secretaryToken, 403],
      ["/api/admin/realisations", "POST", secretaryToken, undefined], ["/api/admin/settings", "GET", secretaryToken, 403], ["/api/admin/users", "GET", associateToken, 403], ["/api/admin/pricing", "PUT", associateToken, undefined],
      ["/api/admin/leads", "GET", auditorToken, undefined], ["/api/admin/leads", "POST", auditorToken, 403], ["/api/admin/new-unknown", "GET", associateToken, 403]
    ] as const) assert.equal((await requireAdmin(request(path, method, undefined, token)))?.status, status, `${method} ${path}`);
    assert.ok(hasPermission("secretary", "mail:send")); assert.ok(!hasPermission("associate", "connectors:manage")); assert.ok(!hasPermission("auditor", "mail:send"));
    assert.equal((await GET(request("/api/admin/users", "GET", undefined, secretaryToken))).status, 403);
    const list = await GET(request("/api/admin/users")); assert.equal(list.status, 200); const listing = await list.json(); assert.equal(listing.users.find((user: { id: string }) => user.id === "main-one").protected, true); assert.ok(!JSON.stringify(listing).includes("passwordHash"));
    const password = "new-fixture-password";
    const created = await POST(request("/api/admin/users", "POST", { name: "Nouvel operateur", email: " NEW@EXAMPLE.TEST ", role: "secretary", password })); assert.equal(created.status, 201);
    const newUser = (await created.json()).user; assert.equal(newUser.email, "new@example.test"); assert.equal(newUser.active, true); assert.equal(newUser.version, 0); assert.ok(!JSON.stringify(newUser).includes(password)); assert.ok(await bcrypt.compare(password, users.get(newUser.id)!.passwordHash)); assert.ok(users.get(newUser.id)!.passwordHash.includes("$12$"));
    assert.equal((await POST(request("/api/admin/users", "POST", { name: "Autre", email: "new@example.test", role: "secretary", password }))).status, 409);
    assert.equal((await POST(request("/api/admin/users", "POST", { name: "Court", email: "short@example.test", role: "admin", password: "short" }))).status, 400);
    assert.equal((await PATCH(request("/api/admin/users", "PATCH", { id: "main-one", expectedVersion: 0, password }))).status, 409);
    assert.equal((await PATCH(request("/api/admin/users", "PATCH", { id: "admin-one", expectedVersion: 0, active: false }, adminToken))).status, 409, "Autodesactivation refusee");
    assert.equal((await PATCH(request("/api/admin/users", "PATCH", { id: "admin-one", expectedVersion: 0, role: "auditor" }))).status, 409, "Dernier admin DB conserve meme avec acces ENV de reprise");
    const staleToken = tokenFor(newUser.id);
    assert.equal((await PATCH(request("/api/admin/users", "PATCH", { id: newUser.id, expectedVersion: 0, name: "Nom modifie", password: "reset-fixture-password" }))).status, 200);
    assert.equal(await getServerIdentity(staleToken), null, "Une modification revoque immediatement la session DB");
    assert.equal((await me(request("/api/auth/me", "GET", undefined, staleToken))).status, 401);
    assert.equal((await PATCH(request("/api/admin/users", "PATCH", { id: newUser.id, expectedVersion: 0, name: "Ecrasement obsolete" }))).status, 409);
    const liveToken = tokenFor(newUser.id); assert.equal((await getServerIdentity(liveToken))?.name, "Nom modifie");
    assert.equal((await PATCH(request("/api/admin/users", "PATCH", { id: newUser.id, expectedVersion: 1, active: false }))).status, 200); assert.equal(await getServerIdentity(liveToken), null);
    const loginRequest = (email: string, pass: string) => new NextRequest(`${origin}/api/auth/admin`, { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify({ email, password: pass }) });
    const databaseLogin = await login(loginRequest("secretary-one@example.test", "fixture-password")); assert.equal(databaseLogin.status, 200); assert.ok(databaseLogin.cookies.get(adminCookieName)?.value.startsWith("v2."));
    assert.equal((await login(loginRequest(newUser.email, "reset-fixture-password"))).status, 401, "Un compte inactif ne se reconnecte pas");
    assert.equal((await login(loginRequest("main@example.test", "fixture-password"))).status, 401, "Le vieux hash bootstrap ne contourne pas le mot de passe principal ENV");
    assert.equal((await login(loginRequest("main@example.test", "fixture-environment-only"))).status, 200, "Acces de reprise conserve meme si la ligne historique est inactive");
    assert.ok(validAdminSession(secretaryToken)); users.get("secretary-one")!.sessionVersion++; assert.equal(await getServerIdentity(secretaryToken), null, "La signature Edge seule ne contourne pas la revocation SQL");
    assert.ok(locks > 0); assert.ok(events.length >= 3); assert.ok(events.every(event => event.actor === "main@example.test")); assert.ok(!JSON.stringify(events).includes("reset-fixture-password"));
    console.log("PASS : comptes bcrypt, roles/permissions serveur, sessions Node/Edge et revocation SQL, identite sans secret, principal ENV protege, dernier admin, autodesactivation, versions et audits reels. Doubles uniquement, aucun SQL ni reseau reel.");
  } finally {
    Object.assign(prisma.user, { findUnique: original.findUnique, findFirst: original.findFirst, findMany: original.findMany, create: original.create, update: original.update, count: original.count }); prisma.auditLog.create = original.audit; prisma.$transaction = original.transaction; prisma.$queryRaw = original.query;
    for (const [key, value] of previous) if (value === undefined) delete process.env[key]; else process.env[key] = value;
    await prisma.$disconnect();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
