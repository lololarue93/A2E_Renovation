import assert from "node:assert/strict";
import dns from "node:dns/promises";
import { randomUUID } from "node:crypto";
import nodemailer from "nodemailer";
import { NextRequest } from "next/server";
import { prisma } from "../src/lib/db/prisma";
import { mailEncryptionConfigured, openMailSecret, sealMailSecret } from "../src/lib/email/mail-secrets";
import { CONNECTORS_KEY, LISTS_KEY, connectorsInputSchema, environmentConnectors, listsInputSchema, mailConnectorsView, mailListsView, notificationListRecipients, readMailConnectorStore, resolveMailConnector, saveMailConnectors, saveMailLists } from "../src/lib/email/mail-store";
import { composeMailSchema, prepareManualMail, safeMailLog, sendManualMail } from "../src/lib/email/manual-mail";
import { publicSmtpAddress, resolvePublicSmtp, verifyMailConnector } from "../src/lib/email/mail-transport";
import { deliverNotificationEmail } from "../src/lib/email/send-lead-notification";
import { MailServiceError } from "../src/lib/email/mail-errors";
import { GET as getConnectors, PUT as putConnectors } from "../src/app/api/admin/mail/connectors/route";
import { GET as getLists, PUT as putLists } from "../src/app/api/admin/mail/lists/route";
import { POST as verify } from "../src/app/api/admin/mail/verify/route";
import { POST as test } from "../src/app/api/admin/mail/test/route";
import { POST as send } from "../src/app/api/admin/mail/send/route";
import { GET as logs } from "../src/app/api/admin/mail/logs/route";
import { PUT as putSettings } from "../src/app/api/admin/settings/route";

async function main() {
  const envKeys = ["AUTH_SECRET", "MAIL_ENCRYPTION_KEY", "DATABASE_URL", "SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD", "SMTP_FROM", "SMTP_PORT", "SMTP_SECURE", "ADMIN_EMAIL", "ADMIN_PASSWORD"];
  const environment = new Map(envKeys.map(key => [key, process.env[key]]));
  const original = { lookup: dns.lookup, transport: nodemailer.createTransport, fetch: globalThis.fetch, transaction: prisma.$transaction, settings: prisma.siteSettings.findUnique, create: prisma.webhookEvent.create, update: prisma.webhookEvent.update, find: prisma.webhookEvent.findUnique };
  const settings = new Map<string, unknown>(), events = new Map<string, { id: string; name: string; payload: Record<string, unknown>; status: string; createdAt: Date }>();
  const audits: unknown[] = [], messages: { to: string[]; from: { address: string }; subject: string; text: string }[] = [], transports: Record<string, unknown>[] = [];
  let dnsPrivate = false, verifyFailure = false, verifyCount = 0, closed = 0, externalFetch = 0;
  const clone = <T>(value: T): T => structuredClone(value);
  const settingFind = async ({ where }: { where: { key: string } }) => settings.has(where.key) ? { key: where.key, value: clone(settings.get(where.key)) } : null;
  const createEvent = async ({ data }: { data: { id: string; name: string; payload: Record<string, unknown>; status: string } }) => {
    if (events.has(data.id)) throw Object.assign(new Error("Duplicate test event"), { code: "P2002" });
    const event = { ...clone(data), createdAt: new Date() }; events.set(data.id, event); return event;
  };
  const updateEvent = async ({ where, data }: { where: { id: string }; data: Partial<{ payload: Record<string, unknown>; status: string }> }) => {
    const event = events.get(where.id); if (!event) throw new Error("Missing test event"); Object.assign(event, clone(data)); return clone(event);
  };
  const tx = { siteSettings: { findUnique: settingFind, upsert: async ({ where, update }: { where: { key: string }; update: { value: unknown } }) => { settings.set(where.key, clone(update.value)); return { key: where.key, value: clone(update.value) }; } }, webhookEvent: { create: createEvent }, auditLog: { create: async (value: unknown) => { audits.push(clone(value)); return value; } } };
  try {
    Object.assign(process.env, { AUTH_SECRET: "mail-test-auth-secret-at-least-thirty-two-characters", MAIL_ENCRYPTION_KEY: "mail-test-encryption-key-never-a-real-credential", DATABASE_URL: "postgresql://unused.invalid/mail-tests", SMTP_HOST: "smtp.environment.test", SMTP_USER: "env@example.test", SMTP_PASSWORD: "environment-test-secret", SMTP_FROM: "env@example.test", SMTP_PORT: "465", SMTP_SECURE: "true", ADMIN_EMAIL: "admin@example.test", ADMIN_PASSWORD: "mail-tests-only" });
    dns.lookup = (async () => [{ address: dnsPrivate ? "192.168.1.1" : "93.184.216.34", family: 4 }]) as unknown as typeof dns.lookup;
    globalThis.fetch = (async () => { externalFetch++; throw new Error("External HTTP forbidden in this test"); }) as typeof fetch;
    nodemailer.createTransport = ((options: Record<string, unknown>) => {
      transports.push(options);
      return { verify: async () => { verifyCount++; if (verifyFailure) throw Object.assign(new Error("credential-should-never-leak"), { code: "EAUTH" }); return true; }, sendMail: async (input: { to: string[]; from: { address: string }; subject: string; text: string }) => { messages.push(clone(input)); const rejected = input.to.filter(email => email.startsWith("two@")); return { accepted: input.to.filter(email => !rejected.includes(email)), rejected }; }, close: () => { closed++; } };
    }) as unknown as typeof nodemailer.createTransport;
    prisma.siteSettings.findUnique = settingFind as unknown as typeof prisma.siteSettings.findUnique;
    prisma.webhookEvent.create = createEvent as unknown as typeof prisma.webhookEvent.create;
    prisma.webhookEvent.update = updateEvent as unknown as typeof prisma.webhookEvent.update;
    prisma.webhookEvent.findUnique = (async ({ where }: { where: { id: string } }) => events.has(where.id) ? clone(events.get(where.id)) : null) as unknown as typeof prisma.webhookEvent.findUnique;
    prisma.$transaction = (async (operation: (client: typeof tx) => Promise<unknown>) => operation(tx)) as unknown as typeof prisma.$transaction;

    // Authentication is checked before settings, logs or the mocked network are used.
    for (const [handler, method] of [[getConnectors, "GET"], [putConnectors, "PUT"], [getLists, "GET"], [putLists, "PUT"], [verify, "POST"], [test, "POST"], [send, "POST"], [logs, "GET"]] as const) {
      const response = await handler(new Request("http://localhost/api/admin/mail/test", { method })); assert.equal(response.status, 401);
    }
    assert.equal(messages.length, 0); assert.equal(transports.length, 0);
    assert.equal(mailEncryptionConfigured(), true);
    const sealed = sealMailSecret("synthetic-secret-only", "connector-one");
    assert.equal(openMailSecret(sealed, "connector-one"), "synthetic-secret-only"); assert.ok(!JSON.stringify(sealed).includes("synthetic-secret-only"));
    assert.throws(() => openMailSecret(sealed, "connector-two"), /mail_secret_unreadable/);
    const previousKey = process.env.MAIL_ENCRYPTION_KEY; process.env.MAIL_ENCRYPTION_KEY = "different-test-key-with-at-least-thirty-two-characters";
    assert.throws(() => openMailSecret(sealed, "connector-one"), /mail_secret_unreadable/); process.env.MAIL_ENCRYPTION_KEY = previousKey;

    for (const address of ["127.0.0.1", "10.0.0.1", "169.254.169.254", "172.16.2.1", "192.168.1.1", "100.64.0.1", "0.0.0.0", "224.0.0.1", "::1", "fc00::1", "fe80::1", "::ffff:127.0.0.1", "2001:db8::1"]) assert.equal(publicSmtpAddress(address), false, address);
    assert.equal(publicSmtpAddress("93.184.216.34"), true); assert.equal(publicSmtpAddress("2606:4700:4700::1111"), true);
    await assert.rejects(resolvePublicSmtp("127.0.0.1"), /smtp_host_refused/); await assert.rejects(resolvePublicSmtp("smtp.internal"), /smtp_host_refused/);
    dnsPrivate = true; await assert.rejects(resolvePublicSmtp("smtp.public.test"), /smtp_host_refused/); dnsPrivate = false;

    const connectorId = randomUUID();
    const connector = { id: connectorId, name: "Equipe test", provider: "smtp" as const, preset: "custom" as const, host: "smtp.public.test", port: 587 as const, security: "starttls" as const, username: "technical-user", fromEmail: "saved@example.test", fromName: "A2E test", enabled: true, secret: "stored-test-secret-only" };
    assert.equal(connectorsInputSchema.safeParse({ version: 0, defaultConnectorId: connectorId, connectors: [{ ...connector, security: "tls" }] }).success, false);
    let view = await saveMailConnectors({ version: 0, defaultConnectorId: connectorId, connectors: [connector] }, "admin@example.test");
    assert.equal(view.version, 1); assert.equal(view.connectors[0].configured, true); assert.equal(view.connectors[0].secretConfigured, true);
    assert.ok(!JSON.stringify(view).includes(connector.secret)); assert.ok(!JSON.stringify(view).includes("ciphertext"));
    assert.ok(!JSON.stringify([...settings.values()]).includes(connector.secret)); assert.ok(!JSON.stringify(audits).includes(connector.secret));
    const storedSecret = JSON.stringify((await readMailConnectorStore()).connectors[0].sealedSecret);
    view = await saveMailConnectors({ version: 1, defaultConnectorId: connectorId, connectors: [{ ...connector, secret: "" }] }, "admin@example.test");
    assert.equal(JSON.stringify((await readMailConnectorStore()).connectors[0].sealedSecret), storedSecret, "Blank password preserves its ciphertext");
    await assert.rejects(saveMailConnectors({ version: 0, defaultConnectorId: null, connectors: [] }, "admin@example.test"), /mail_version_conflict/);
    view = await saveMailConnectors({ version: 2, defaultConnectorId: connectorId, connectors: [{ ...connector, secret: "", clearSecret: true }] }, "admin@example.test"); assert.equal(view.connectors[0].configured, false);
    view = await saveMailConnectors({ version: 3, defaultConnectorId: connectorId, connectors: [connector] }, "admin@example.test"); assert.equal(view.connectors[0].configured, true);
    await assert.rejects(saveMailConnectors({ version: 4, defaultConnectorId: connectorId, connectors: [{ ...connector, host: "smtp.changed.test", secret: "" }] }, "admin@example.test"), /mail_secret_context_changed/);
    await assert.rejects(saveMailConnectors({ version: 4, defaultConnectorId: connectorId, connectors: [{ ...connector, username: "new-account", secret: "" }] }, "admin@example.test"), /mail_secret_context_changed/);
    const storeSnapshot = clone(settings.get(CONNECTORS_KEY)); settings.set(CONNECTORS_KEY, { schemaVersion: 99 });
    await assert.rejects(mailConnectorsView(), /mail_store_invalid/); settings.set(CONNECTORS_KEY, storeSnapshot);
    const resolved = await resolveMailConnector(); assert.equal(resolved.secret, connector.secret); assert.equal(resolved.fromEmail, connector.fromEmail);
    const verified = await verifyMailConnector(resolved); assert.equal(verified.ok, true); assert.equal(verifyCount, 1); assert.equal(messages.length, 0);
    const options = transports.at(-1)!; assert.equal(options.host, "93.184.216.34"); assert.equal(options.requireTLS, true); assert.equal(options.secure, false); assert.equal((options.tls as { servername: string }).servername, connector.host); assert.equal((options.tls as { rejectUnauthorized: boolean }).rejectUnauthorized, true);
    verifyFailure = true; const failure = await verifyMailConnector(resolved); assert.equal(failure.reason, "smtp_auth_failed"); assert.ok(!JSON.stringify(failure).includes("credential-should-never-leak")); verifyFailure = false;

    const teamId = randomUUID(), clientsId = randomUUID();
    const listInput = { version: 0, notificationListIds: [teamId], lists: [{ id: teamId, name: "Equipe", type: "team" as const, members: [{ email: "one@example.test", name: "Equipe un", consent: false }, { email: "two@example.test", name: "Equipe deux", consent: false }] }, { id: clientsId, name: "Clients autorises", type: "clients" as const, members: [{ email: "client@example.test", name: "Client", consent: true }, { email: "blocked@example.test", name: "Sans accord", consent: false }] }] };
    assert.equal(listsInputSchema.safeParse({ ...listInput, notificationListIds: [clientsId] }).success, false);
    await saveMailLists(listInput, "operator@example.test");
    assert.deepEqual(await notificationListRecipients(["one@example.test"]), ["one@example.test", "two@example.test"]);
    const composition = { action: "send" as const, requestId: randomUUID(), listIds: [teamId, clientsId], recipients: ["one@example.test"], consentConfirmed: true, subject: "Un message de test", message: "Texte de test\n<script> reste du texte." };
    assert.equal(composeMailSchema.safeParse({ ...composition, subject: "Injected\r\nBcc:bad@example.test" }).success, false);
    await assert.rejects(prepareManualMail({ ...composition, consentConfirmed: false }), /mail_consent_required/);
    const prepared = await prepareManualMail(composition); assert.equal(prepared.preview.recipientCount, 3); assert.equal(prepared.preview.excludedCount, 1); assert.ok(!prepared.preview.recipients.some(item => item.email === "blocked@example.test"));
    await assert.rejects(sendManualMail(composition, "operator@example.test"), /mail_preview_stale/);
    const input = { ...composition, previewToken: prepared.preview.previewToken };
    const before = messages.length;
    const result = await sendManualMail(input, "operator@example.test"); assert.equal(result.status, "partial"); assert.equal(result.acceptedCount, 2); assert.equal(result.rejectedCount, 1); assert.equal(messages.length, before + 3);
    assert.ok(messages.slice(before).every(message => message.to.length === 1 && message.from.address === "saved@example.test"));
    const duplicate = await sendManualMail(input, "operator@example.test"); assert.equal(duplicate.duplicate, true); assert.equal(messages.length, before + 3, "Retry does not resend accepted or uncertain recipients");
    const altered = { ...input, message: "Contenu change" }; altered.previewToken = (await prepareManualMail(altered)).preview.previewToken;
    await assert.rejects(sendManualMail(altered, "operator@example.test"), /mail_request_conflict/); assert.equal(messages.length, before + 3);
    const concurrentInput = { ...composition, requestId: randomUUID() }; const concurrentToken = (await prepareManualMail(concurrentInput)).preview.previewToken;
    const concurrencyBefore = messages.length;
    await Promise.all([sendManualMail({ ...concurrentInput, previewToken: concurrentToken }, "operator@example.test"), sendManualMail({ ...concurrentInput, previewToken: concurrentToken }, "operator@example.test")]);
    assert.equal(messages.length, concurrencyBefore + 3, "Only one owner sends a concurrent UUID");
    const stale = { ...composition, requestId: randomUUID() }; const staleToken = (await prepareManualMail(stale)).preview.previewToken;
    await saveMailLists({ ...listInput, version: 1, lists: listInput.lists.map(item => item.id === teamId ? { ...item, members: [...item.members, { email: "new@example.test", name: "New", consent: false }] } : item) }, "operator@example.test");
    await assert.rejects(sendManualMail({ ...stale, previewToken: staleToken }, "operator@example.test"), /mail_preview_stale/);
    const transportStale = { ...composition, requestId: randomUUID() }; const transportToken = (await prepareManualMail(transportStale)).preview.previewToken;
    await saveMailConnectors({ version: 4, defaultConnectorId: connectorId, connectors: [{ ...connector, secret: "rotated-synthetic-secret" }] }, "admin@example.test");
    await assert.rejects(sendManualMail({ ...transportStale, previewToken: transportToken }, "operator@example.test"), /mail_preview_stale/, "A changed credential invalidates the previous preview without exposing it");

    settings.set("notifications", { provider: "brevo", recipients: ["one@example.test"], events: { leadCreated: true } });
    const auto = await deliverNotificationEmail({ recipients: ["one@example.test"], subject: "Automatic test", html: "<p>Test</p>", text: "Test" }, { provider: "brevo" });
    assert.equal(auto.ok, true); assert.equal(messages.at(-1)?.from.address, "saved@example.test", "Default admin connector is used by notifications despite legacy provider");
    const env = await resolveMailConnector("env-smtp", "smtp"); assert.equal(env.fromEmail, "env@example.test"); assert.equal(env.secret, "environment-test-secret");
    delete process.env.SMTP_HOST;
    assert.equal(environmentConnectors("smtp")[0].enabled, false, "Incomplete generic SMTP must not guess an OVH host");
    settings.set("notifications", { provider: "gmail", recipients: ["one@example.test"], events: { leadCreated: true } });
    assert.equal((await resolveMailConnector("env-smtp")).host, "smtp.gmail.com", "Connection tests inherit the configured Gmail preset without SMTP_HOST");
    settings.set("notifications", { provider: "ovh", recipients: ["one@example.test"], events: { leadCreated: true } });
    assert.equal((await resolveMailConnector("env-smtp")).host, "ssl0.ovh.net", "Connection tests inherit the configured OVH preset without SMTP_HOST");
    const beforeLists = clone(settings.get(LISTS_KEY));
    const capacityMembers = Array.from({ length: 50 }, (_, index) => ({ email: `capacity-${index}@example.test`, name: "", consent: false }));
    await assert.rejects(saveMailLists({ version: 2, notificationListIds: [teamId], lists: [{ id: teamId, name: "Capacity", type: "team", members: capacityMembers }] }, "operator@example.test"), /mail_notification_limit/, "List writer counts the existing legacy recipient too");
    assert.deepEqual(settings.get(LISTS_KEY), beforeLists, "Over-limit lists are rejected before persistence");
    await saveMailLists({ version: 2, notificationListIds: [teamId], lists: [{ id: teamId, name: "Capacity", type: "team", members: capacityMembers.slice(0, 49) }] }, "operator@example.test");
    assert.equal((await mailListsView()).effectiveNotificationRecipients.length, 50);
    const beforeLegacy = clone(settings.get("notifications"));
    const authorization = `Basic ${Buffer.from("admin@example.test:mail-tests-only").toString("base64")}`;
    const legacyPayload = { provider: "ovh", leadEmail: "one@example.test", recipients: ["one@example.test", "extra@example.test"], events: { leadCreated: true, pdfGenerated: false, mediaUploaded: false, securityAlert: false }, telegramEnabled: false, trackingEnabled: false, signatureDiscountPercent: 0, signatureWindowDays: 15, phone: "0100000000", instagram: "", facebook: "", linkedin: "" };
    const overLegacy = await putSettings(new NextRequest("http://localhost/api/admin/settings", { method: "PUT", headers: { authorization, "content-type": "application/json" }, body: JSON.stringify(legacyPayload) }));
    assert.equal(overLegacy.status, 400); assert.equal((await overLegacy.json()).reason, "mail_notification_limit");
    assert.deepEqual(settings.get("notifications"), beforeLegacy, "Legacy writer rejects an over-limit union before any settings write");
    settings.set(LISTS_KEY, { schemaVersion: 1, version: 4, notificationListIds: [teamId], lists: [{ id: teamId, name: "Old over-limit config", type: "team", members: capacityMembers }] });
    assert.equal((await mailListsView()).effectiveNotificationRecipients.length, 51, "An old over-limit distribution remains readable for repair");
    settings.set(LISTS_KEY, beforeLists);
    const safe = safeMailLog({ id: "log", name: "mail.connection", status: "failed", createdAt: new Date(), payload: { reason: "secret must not escape", password: "secret", ciphertext: "private" } }); assert.ok(!JSON.stringify(safe).includes("secret")); assert.ok(!JSON.stringify(safe).includes("private"));
    assert.equal(externalFetch, 0); assert.equal(closed, transports.length, "Every mocked SMTP connection was closed");
    assert.ok(settings.has(LISTS_KEY)); assert.ok(events.size > 0); assert.ok(audits.length > 0);
    console.log("PASS mail workspace: AES-GCM, no credential exposure, version conflicts, ENV fallback, active notifications, SMTP TLS/public DNS pinning, connection-only check, consented lists, preview binding, individual sends, partial results and concurrent idempotency. In-memory doubles only, no external network or email.");
  } finally {
    dns.lookup = original.lookup; nodemailer.createTransport = original.transport; globalThis.fetch = original.fetch; prisma.$transaction = original.transaction; prisma.siteSettings.findUnique = original.settings; prisma.webhookEvent.create = original.create; prisma.webhookEvent.update = original.update; prisma.webhookEvent.findUnique = original.find;
    for (const [key, value] of environment) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    await prisma.$disconnect();
  }
}
main().catch(error => { console.error(error instanceof MailServiceError ? error.reason : error); process.exitCode = 1; });
