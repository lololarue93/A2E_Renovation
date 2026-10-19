import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, open, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseEnv } from "node:util";
import bcrypt from "bcryptjs";
import { Prisma, PrismaClient, type SiteSettings } from "@prisma/client";
import type { MailConnectorInput, MailConnectorsView, MailListsView, MailPreview, MailSendResult } from "../src/lib/email/mail-contract";

/** Explicit local HTTP/SQL recipe. Never starts a server or contacts a real email provider. */
async function main() {
  assert.equal(process.env.A2E_LOCAL_RECIPE, "true", "Explicit local recipe opt-in required");
  assert.equal(process.argv.length, 2, "No command-line override is allowed for this isolated recipe");
  const base = new URL("http://127.0.0.1:3100");
  const local = parseEnv(await readFile(resolve(".env.local"), "utf8"));
  const database = new URL(local.DATABASE_URL ?? "");
  assert.ok(["postgresql:", "postgres:"].includes(database.protocol) && database.hostname === "127.0.0.1" && database.port === "55432" && /^\/a2e_qa_[A-Za-z0-9_-]+$/.test(database.pathname), "Isolated local QA database required");
  const configuredSite = new URL(local.NEXT_PUBLIC_SITE_URL ?? "");
  assert.equal(configuredSite.origin, base.origin); assert.equal(configuredSite.pathname, "/"); assert.ok(!configuredSite.username && !configuredSite.password && !configuredSite.search && !configuredSite.hash);
  assert.ok(local.ADMIN_EMAIL && local.ADMIN_PASSWORD, "Private local administrator configuration required");
  const runId = randomUUID(), startedAt = new Date();
  const directory = resolve("docs/preview-tests"); await mkdir(directory, { recursive: true });
  const lockPath = resolve(directory, "release-http.lock"), lock = await open(lockPath, "wx"); await lock.writeFile(runId);
  const reportPath = resolve(directory, `team-mail-http-${runId}.json`);
  const privateDirectory = resolve(".local"); await mkdir(privateDirectory, { recursive: true });
  const snapshotPath = resolve(privateDirectory, `team-mail-http-${runId}-settings.json`);
  const report = { runId, origin: base.origin, startedAt: startedAt.toISOString(), passed: false, cleanup: false, externalEmailSent: false, checks: [] as { name: string; passed: boolean; details?: Record<string, unknown> }[], requests: [] as { method: string; path: string; status: number }[] };
  const prisma = new PrismaClient({ datasources: { db: { url: local.DATABASE_URL } } });
  const guardKey = `qa_team_guard_${runId.replaceAll("-", "")}`, crmId = `crm-${runId}`, connectorId = randomUUID(), teamId = randomUUID(), clientsId = randomUUID();
  const fixtureEmails = ["associate1", "associate2", "secretary", "auditor", "admin"].map(role => `qa-${role}-${runId}@example.invalid`);
  const fixtureSecret = randomBytes(32).toString("base64url"), fixturePassword = randomBytes(24).toString("base64url"), resetPassword = randomBytes(24).toString("base64url");
  const domain = `qa-${runId}.invalid`, connectorHost = domain;
  const sendIds = new Set<string>(), userIds = new Set<string>();
  type Snapshot = { original: SiteSettings | null; expected: Prisma.JsonValue | undefined; captured: boolean };
  const settings = new Map<string, Snapshot>(["mail.connectors.v1", "mail.lists.v1", "notifications"].map(key => [key, { original: null, expected: undefined, captured: false }]));
  let currentCheck = "initialization", principalCookie = "", adminCookie = "", markerId: string | undefined, serverGuarded = false;
  const jsonInput = (value: Prisma.JsonValue) => value === null ? Prisma.JsonNull : value as Prisma.InputJsonValue;
  const record = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const request = async (path: string, method = "GET", body?: unknown, cookie = principalCookie) => {
    assert.equal(new URL(path, base).origin, base.origin, "Requests must stay on the guarded loopback origin");
    const response = await fetch(new URL(path, base), { method, redirect: "manual", signal: AbortSignal.timeout(30_000), headers: { ...(body === undefined ? {} : { "content-type": "application/json" }), ...(cookie ? { cookie } : {}), ...(["GET", "HEAD"].includes(method) ? {} : { origin: base.origin }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    report.requests.push({ method, path: new URL(path, base).pathname, status: response.status }); return response;
  };
  const status = (response: Response, expected: number) => assert.equal(response.status, expected, `${currentCheck}: HTTP status`);
  const check = async (name: string, operation: () => Promise<Record<string, unknown> | void>) => { currentCheck = name; const details = await operation(); report.checks.push({ name, passed: true, ...(details ? { details } : {}) }); };
  const login = async (email: string, password: string) => {
    const response = await request("/api/auth/admin", "POST", { email, password }, ""); status(response, 200);
    const cookie = response.headers.getSetCookie().find(value => value.startsWith("a2e_admin_session=")); assert.ok(cookie && /HttpOnly/i.test(cookie)); return cookie.split(";")[0];
  };
  const captureWrite = async (key: string, version?: number) => {
    const row = await prisma.siteSettings.findUniqueOrThrow({ where: { key } });
    if (version !== undefined) assert.equal(record(row.value).version, version, "Do not adopt a concurrently changed settings snapshot");
    settings.get(key)!.expected = row.value; return row;
  };
  const connectorInput = (view: MailConnectorsView): MailConnectorInput[] => view.connectors.filter(item => item.source === "admin").map(({ secretConfigured: _secret, configured: _configured, source: _source, ...fields }) => fields);
  const users = new Map<string, { id: string; email: string; role: string; version: number; cookie: string }>();
  let connectors: MailConnectorsView, lists: MailListsView;

  try {
    await check("guarded SQL and HTTP identity before business mutations", async () => {
      principalCookie = await login(local.ADMIN_EMAIL!, local.ADMIN_PASSWORD!);
      const marker = await prisma.priceItem.create({ data: { key: guardKey, category: "electricity", label: `QA team guard ${runId}`, unit: "point", low: 1, mid: 2, high: 3, vatRate: 20 } }); markerId = marker.id;
      const response = await request("/api/admin/pricing"); status(response, 200); const catalog = await response.json(); assert.equal(catalog.source, "database"); assert.ok(catalog.items.some((item: { key: string; id: string }) => item.key === guardKey && item.id === markerId));
      serverGuarded = true;
      const me = await request("/api/auth/me"); status(me, 200); const identity = await me.json(); assert.equal(identity.user.source, "environment"); assert.ok(me.headers.get("cache-control")?.includes("no-store"));
      return { sqlMarkerConfirmed: true, loopbackOnly: true };
    });
    await check("snapshot and mute notification settings", async () => {
      assert.ok(serverGuarded);
      for (const [key, snapshot] of settings) { snapshot.original = await prisma.siteSettings.findUnique({ where: { key } }); snapshot.expected = snapshot.original?.value; snapshot.captured = true; }
      await writeFile(snapshotPath, JSON.stringify(Object.fromEntries([...settings].map(([key, snapshot]) => [key, snapshot.original])), null, 2), { flag: "wx" });
      const original = record(settings.get("notifications")!.original?.value), events = record(original.events);
      const muted = { ...original, provider: "smtp", recipients: [`team@${domain}`], events: { ...events, leadCreated: false, pdfGenerated: false, mediaUploaded: false, securityAlert: false }, telegramEnabled: false, trackingEnabled: false };
      await prisma.siteSettings.upsert({ where: { key: "notifications" }, update: { value: muted }, create: { key: "notifications", value: muted } }); await captureWrite("notifications");
    });
    await check("five real accounts bcrypt login identity and reload", async () => {
      for (const [index, key] of ["associate1", "associate2", "secretary", "auditor", "admin"].entries()) {
        const role = key.startsWith("associate") ? "associate" : key;
        const response = await request("/api/admin/users", "POST", { name: `QA ${key} ${runId}`, email: fixtureEmails[index], role, password: fixturePassword }); status(response, 201); const user = (await response.json()).user; userIds.add(user.id);
        assert.equal(user.email, fixtureEmails[index]); assert.equal(user.version, 0); assert.equal(user.active, true); assert.ok(!JSON.stringify(user).includes(fixturePassword)); assert.ok(!("passwordHash" in user));
        const stored = await prisma.user.findUniqueOrThrow({ where: { id: user.id } }); assert.ok(stored.passwordHash.includes("$12$")); assert.ok(await bcrypt.compare(fixturePassword, stored.passwordHash));
        const cookie = await login(user.email, fixturePassword); const meResponse = await request("/api/auth/me", "GET", undefined, cookie); status(meResponse, 200); const me = (await meResponse.json()).user; assert.equal(me.id, user.id); assert.equal(me.role, role); assert.equal(me.source, "database");
        users.set(key, { id: user.id, email: user.email, role, version: 0, cookie });
      }
      adminCookie = users.get("admin")!.cookie;
      const listing = await request("/api/admin/users", "GET", undefined, adminCookie); status(listing, 200); const data = await listing.json(); assert.equal(data.users.filter((user: { id: string }) => userIds.has(user.id)).length, 5); assert.ok(!JSON.stringify(data).includes("passwordHash"));
      const duplicate = await request("/api/admin/users", "POST", { name: "QA duplicate", email: fixtureEmails[0].toUpperCase(), role: "associate", password: fixturePassword }, adminCookie); status(duplicate, 409);
      return { accountsCreated: 5, realBcryptVerified: true, identityReloaded: true };
    });
    await check("role authorization and real audit actor", async () => {
      const associate = users.get("associate1")!, secretary = users.get("secretary")!, auditor = users.get("auditor")!;
      for (const person of [associate, secretary]) status(await request("/api/admin/users", "GET", undefined, person.cookie), 403);
      status(await request("/api/admin/pricing", "PUT", {}, secretary.cookie), 403);
      status(await request("/api/admin/mail/connectors", "PUT", {}, associate.cookie), 403);
      for (const [path, method] of [["/api/admin/leads", "POST"], ["/api/admin/cotations", "PUT"], ["/api/admin/pricing", "PUT"], ["/api/admin/realisations", "POST"], ["/api/admin/mail/send", "POST"]]) status(await request(path, method, {}, auditor.cookie), 403);
      status(await request("/api/admin/pricing", "GET", undefined, secretary.cookie), 200); status(await request("/api/admin/leads", "GET", undefined, auditor.cookie), 200);
      const price = { key: guardKey, category: "electricity", label: `QA team guard ${runId}`, unit: "point", low: 11.5, mid: 12.5, high: 13.5, reference: "Fixture only", description: "UUID recipe marker only", vatRate: 20 };
      status(await request("/api/admin/pricing", "PUT", price, associate.cookie), 200);
      assert.equal((await prisma.priceItem.findUniqueOrThrow({ where: { id: markerId! } })).mid, 12.5);
      const body = { requestId: runId, contact: { name: `QA team contact ${runId}`, company: "", email: `lead@${domain}`, phone: "0100000000", city: "Melun", typeProjet: "other", sourceLead: "manual", budget: null, consent: false }, nextAction: null, nextActionDate: null, note: `QA note ${runId}` };
      status(await request("/api/admin/leads", "POST", body, secretary.cookie), 201);
      status(await request("/api/admin/leads", "PATCH", { id: crmId, status: "a_rappeler", previousStatus: "nouveau", expectedVersion: 0, activity: { kind: "call", note: `QA activity ${runId}`, occurredAt: new Date().toISOString() } }, secretary.cookie), 200);
      const activity = await prisma.leadActivity.findFirstOrThrow({ where: { leadId: crmId, kind: "call" } }); assert.equal(activity.actor, secretary.email);
      const audit = await prisma.auditLog.findFirstOrThrow({ where: { entity: "PriceItem", entityId: markerId, action: "pricing.updated" }, orderBy: { createdAt: "desc" } }); assert.equal(audit.actor, associate.email);
      return { secretaryPriceWriteRefused: true, auditorWritesRefused: true, actorStored: true };
    });
    await check("account protection version conflicts reset and immediate revocation", async () => {
      const admin = users.get("admin")!, associate = users.get("associate1")!;
      const listing = await request("/api/admin/users", "GET", undefined, adminCookie); status(listing, 200); const principal = (await listing.json()).users.find((user: { protected: boolean }) => user.protected);
      if (principal) status(await request("/api/admin/users", "PATCH", { id: principal.id, expectedVersion: principal.version, active: false }, adminCookie), 409);
      status(await request("/api/admin/users", "POST", { name: "QA reserved principal", email: local.ADMIN_EMAIL!, role: "admin", password: fixturePassword }, adminCookie), 409);
      status(await request("/api/admin/users", "PATCH", { id: admin.id, expectedVersion: 0, active: false }, adminCookie), 409);
      status(await request("/api/admin/users", "PATCH", { id: associate.id, expectedVersion: 0, password: resetPassword }, adminCookie), 200); associate.version = 1;
      status(await request("/api/admin/leads", "GET", undefined, associate.cookie), 401);
      const revokedPage = await request("/admin", "GET", undefined, associate.cookie); status(revokedPage, 307); assert.equal(new URL(revokedPage.headers.get("location")!, base).pathname, "/admin/connexion");
      status(await request("/api/auth/admin", "POST", { email: associate.email, password: fixturePassword }, ""), 401);
      associate.cookie = await login(associate.email, resetPassword);
      status(await request("/api/admin/users", "PATCH", { id: associate.id, expectedVersion: 0, name: "QA stale version" }, adminCookie), 409);
      const second = users.get("associate2")!;
      status(await request("/api/admin/users", "PATCH", { id: second.id, expectedVersion: 0, email: associate.email.toUpperCase() }, adminCookie), 409);
      const auditor = users.get("auditor")!; status(await request("/api/admin/users", "PATCH", { id: auditor.id, expectedVersion: 0, active: false }, adminCookie), 200); auditor.version = 1;
      status(await request("/api/auth/me", "GET", undefined, auditor.cookie), 401); status(await request("/api/auth/admin", "POST", { email: auditor.email, password: fixturePassword }, ""), 401);
      assert.ok(await bcrypt.compare(resetPassword, (await prisma.user.findUniqueOrThrow({ where: { id: associate.id } })).passwordHash));
      return { resetRevokesApiAndPage: true, oldPasswordRefused: true, protectedPrincipal: true, selfDeactivationRefused: true, obsoleteVersionRefused: true };
    });
    await check("connector persistence encryption and secret redaction", async () => {
      const first = await request("/api/admin/mail/connectors", "GET", undefined, adminCookie); status(first, 200); connectors = await first.json(); assert.equal(connectors.encryptionConfigured, true);
      const existing = connectorInput(connectors); assert.ok(existing.length < 10, "Need one unused connector slot; never remove existing connectors");
      const fixture: MailConnectorInput = { id: connectorId, name: `QA connector ${runId}`, provider: "smtp", preset: "custom", host: connectorHost, port: 465, security: "tls", username: `smtp@${domain}`, fromEmail: `sender@${domain}`, fromName: "QA local only", enabled: true, secret: fixtureSecret };
      const response = await request("/api/admin/mail/connectors", "PUT", { version: connectors.version, defaultConnectorId: connectorId, connectors: [...existing, fixture] }, adminCookie); status(response, 200); const saved = await response.json(); assert.equal(saved.version, connectors.version + 1); const row = await captureWrite("mail.connectors.v1", saved.version);
      assert.ok(!JSON.stringify(row.value).includes(fixtureSecret)); assert.ok(JSON.stringify(row.value).includes("ciphertext"));
      const freshResponse = await request("/api/admin/mail/connectors", "GET", undefined, adminCookie); status(freshResponse, 200); connectors = await freshResponse.json(); assert.ok(!JSON.stringify(connectors).includes(fixtureSecret)); assert.ok(!JSON.stringify(connectors).includes("ciphertext")); assert.equal(connectors.defaultConnectorId, connectorId); assert.equal(connectors.connectors.find(item => item.id === connectorId)?.secretConfigured, true);
      status(await request("/api/admin/mail/connectors", "PUT", { version: connectors.version - 1, defaultConnectorId: connectorId, connectors: connectorInput(connectors) }, adminCookie), 409);
      const preserve = await request("/api/admin/mail/connectors", "PUT", { version: connectors.version, defaultConnectorId: connectorId, connectors: connectorInput(connectors) }, adminCookie); status(preserve, 200); const preserved = await preserve.json(); await captureWrite("mail.connectors.v1", preserved.version);
      const previousCipher = record(record(row.value).connectors && (record(row.value).connectors as unknown[]).find(item => record(item).id === connectorId)).sealedSecret;
      const preservedStore = settings.get("mail.connectors.v1")!.expected; const afterCipher = record((record(preservedStore).connectors as unknown[]).find(item => record(item).id === connectorId)).sealedSecret; assert.deepEqual(afterCipher, previousCipher, "Omitting secret preserves exact encrypted credential");
      return { secretEncryptedInSql: true, secretAbsentFromGet: true, previousConnectorsPreserved: existing.length };
    });
    await check("team client lists preview consent exclusions and deduplication", async () => {
      const first = await request("/api/admin/mail/lists", "GET", undefined, adminCookie); status(first, 200); lists = await first.json(); assert.ok(lists.lists.length <= 18, "Need two unused list slots; never remove existing lists");
      const team = { id: teamId, name: `QA team ${runId}`, type: "team", members: [{ email: `shared@${domain}`, name: "QA shared", consent: false }, { email: `other@${domain}`, name: "QA team", consent: false }, { email: `denied@${domain}`, name: "QA denied", consent: false }] };
      const clients = { id: clientsId, name: `QA clients ${runId}`, type: "clients", members: [{ email: `shared@${domain}`, name: "QA shared client", consent: true }, { email: `allowed@${domain}`, name: "QA allowed", consent: true }, { email: `denied@${domain}`, name: "QA refused", consent: false }] };
      status(await request("/api/admin/mail/lists", "PUT", { version: lists.version, notificationListIds: [clientsId], lists: [...lists.lists, team, clients] }, adminCookie), 400);
      const response = await request("/api/admin/mail/lists", "PUT", { version: lists.version, notificationListIds: [...lists.notificationListIds, teamId], lists: [...lists.lists, team, clients] }, adminCookie); status(response, 200); const result = await response.json(); await captureWrite("mail.lists.v1", result.version);
      const reread = await request("/api/admin/mail/lists", "GET", undefined, users.get("secretary")!.cookie); status(reread, 200); const stored = await reread.json(); assert.equal(stored.lists.find((item: { id: string }) => item.id === clientsId).members.find((item: { email: string }) => item.email === `denied@${domain}`).consent, false);
      const compose = { action: "preview", requestId: randomUUID(), connectorId, listIds: [teamId, clientsId], recipients: [`denied@${domain}`, `allowed@${domain}`], consentConfirmed: true, subject: `QA manual ${runId}`, message: `QA no delivery ${runId}` };
      const previewResponse = await request("/api/admin/mail/send", "POST", compose, users.get("secretary")!.cookie); status(previewResponse, 200); const preview: MailPreview = (await previewResponse.json()).preview; assert.equal(preview.recipientCount, 3); assert.equal(preview.excludedCount, 1); assert.equal(new Set(preview.recipients.map(item => item.email)).size, 3); assert.ok(!preview.recipients.some(item => item.email === `denied@${domain}`));
      sendIds.add(`mail-send-${compose.requestId}`);
      const sendBody = { ...compose, action: "send", previewToken: preview.previewToken };
      const send = await request("/api/admin/mail/send", "POST", sendBody, users.get("secretary")!.cookie); status(send, 200); const resultSend: MailSendResult = (await send.json()).result; assert.equal(resultSend.status, "failed"); assert.equal(resultSend.failedCount, 3); assert.equal(resultSend.acceptedCount, 0); assert.equal(resultSend.duplicate, false);
      const duplicate = await request("/api/admin/mail/send", "POST", sendBody, users.get("secretary")!.cookie); status(duplicate, 200); assert.equal((await duplicate.json()).result.duplicate, true);
      const deliveries = await prisma.webhookEvent.findMany({ where: { name: "mail.delivery", payload: { path: ["parentId"], equals: resultSend.id } } }); assert.equal(deliveries.length, 3); assert.ok(deliveries.every(item => item.status === "failed" && record(item.payload).reason === "smtp_host_refused"));
      return { recipientsAfterDeduplication: 3, explicitRefusalsExcluded: 1, failedBeforeDns: true, duplicateDidNotResend: true };
    });
    await check("SMTP verify test journal and no credential disclosure", async () => {
      const verify = await request("/api/admin/mail/verify", "POST", { connectorId }, adminCookie); status(verify, 200); const verified = await verify.json(); assert.equal(verified.ok, false); assert.equal(verified.reason, "smtp_host_refused");
      const testId = randomUUID(); sendIds.add(`mail-send-${testId}`);
      const testBody = { requestId: testId, connectorId, to: `test@${domain}` };
      const response = await request("/api/admin/mail/test", "POST", testBody, adminCookie); status(response, 200); const tested = (await response.json()).result; assert.equal(tested.status, "failed"); assert.equal(tested.acceptedCount, 0);
      const repeat = await request("/api/admin/mail/test", "POST", testBody, adminCookie); status(repeat, 200); assert.equal((await repeat.json()).result.duplicate, true);
      const logResponse = await request("/api/admin/mail/logs", "GET", undefined, adminCookie); status(logResponse, 200); const logs = await logResponse.json(); assert.ok(!JSON.stringify(logs).includes(fixtureSecret)); assert.ok(!JSON.stringify(logs).includes("ciphertext")); assert.ok(logs.items.some((item: { id: string; status: string }) => item.id === tested.id && item.status === "failed"));
      const sqlLogs = await prisma.webhookEvent.findMany({ where: { OR: [{ payload: { path: ["connectorId"], equals: connectorId } }, ...[...sendIds].map(id => ({ id: { startsWith: id } }))] } }); assert.ok(sqlLogs.length >= 7); assert.ok(!JSON.stringify(sqlLogs).includes(fixtureSecret)); assert.ok(sqlLogs.every(item => !["sent", "partial", "verified"].includes(item.status)));
      return { connectionRefusedBeforeDns: true, testFailedWithoutDelivery: true, journalPersisted: true, secretRedacted: true };
    });
    report.passed = true;
  } catch { report.checks.push({ name: currentCheck, passed: false }); }
  finally {
    let cleanupOkay = true;
    // Restore settings independently of fixture cleanup; never clobber a changed version.
    for (const [key, snapshot] of settings) {
      if (!snapshot.captured) continue;
      try {
        await prisma.$transaction(async tx => {
          const current = await tx.siteSettings.findUnique({ where: { key } }); assert.deepEqual(current?.value, snapshot.expected, "Settings changed concurrently; private snapshot retained instead of overwriting");
          if (snapshot.original) await tx.siteSettings.update({ where: { key }, data: { value: jsonInput(snapshot.original.value) } }); else if (current) await tx.siteSettings.delete({ where: { key } });
        }, { isolationLevel: "Serializable" });
        assert.deepEqual(await prisma.siteSettings.findUnique({ where: { key } }), snapshot.original);
      } catch { cleanupOkay = false; report.checks.push({ name: `guarded restore ${key}`, passed: false }); }
    }
    try {
      const fixtures = await prisma.user.findMany({ where: { email: { in: fixtureEmails } }, select: { id: true } }); for (const user of fixtures) userIds.add(user.id);
      await prisma.webhookEvent.deleteMany({ where: { OR: [{ payload: { path: ["connectorId"], equals: connectorId } }, ...[...sendIds].map(id => ({ id: { startsWith: id } }))] } });
      await prisma.auditLog.deleteMany({ where: { OR: [{ entity: "User", entityId: { in: [...userIds] } }, { actor: { in: fixtureEmails } }] } });
      await prisma.lead.deleteMany({ where: { id: crmId, email: `lead@${domain}` } });
      await prisma.user.deleteMany({ where: { id: { in: [...userIds] }, email: { in: fixtureEmails } } });
      await prisma.priceItem.deleteMany({ where: { key: guardKey, ...(markerId ? { id: markerId } : {}) } });
      assert.equal(await prisma.user.count({ where: { email: { in: fixtureEmails } } }), 0); assert.equal(await prisma.lead.count({ where: { id: crmId } }), 0); assert.equal(await prisma.priceItem.count({ where: { key: guardKey } }), 0);
    } catch { cleanupOkay = false; report.checks.push({ name: "exact UUID fixture cleanup", passed: false }); }
    report.cleanup = cleanupOkay; if (!cleanupOkay) report.passed = false;
    await prisma.$disconnect(); await writeFile(reportPath, JSON.stringify({ ...report, completedAt: new Date().toISOString(), privateSnapshotRetained: !cleanupOkay }, null, 2));
    if (cleanupOkay) await rm(snapshotPath, { force: true });
    await lock.close(); await rm(lockPath);
  }
  console.log(`${report.passed ? "PASS" : "FAIL"} team/mail HTTP: ${report.checks.filter(item => item.passed).length} checks; cleanup ${report.cleanup ? "verified" : "FAILED"}. Report: ${reportPath}`);
  if (!report.passed) { console.error(`Failed check: ${report.checks.find(item => !item.passed)?.name}. Credentials and response bodies are never logged.`); process.exitCode = 1; }
}
main().catch(() => { console.error("Team/mail HTTP verification aborted by its local guard or initialization. No credentials logged."); process.exitCode = 1; });
