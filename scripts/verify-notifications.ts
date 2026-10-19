import assert from "node:assert/strict";
import nodemailer from "nodemailer";
import { NextRequest } from "next/server";
import { prisma } from "../src/lib/db/prisma";
import { emailTransportConfig } from "../src/lib/email/transport-config";
import { deliverNotificationEmail, recordNotificationOutcome, validateRecipients } from "../src/lib/email/send-lead-notification";
import { notificationLogDetails } from "../src/lib/admin/notification-log";
import { GET } from "../src/app/api/admin/notifications/route";

async function main() {
  const synthetic = { SMTP_USER: "sender@example.test", SMTP_PASSWORD: "test-only", SMTP_PORT: "465" };
  assert.equal(emailTransportConfig("gmail", synthetic).configured, true);
  assert.equal(emailTransportConfig("smtp", synthetic).configured, false, "SMTP generique exige un hote");
  assert.equal(emailTransportConfig("ovh", { ...synthetic, SMTP_PORT: "invalid" }).configured, false);
  assert.equal(emailTransportConfig("ovh", { ...synthetic, SMTP_USER: "technical-id" }).configured, false);
  assert.equal(emailTransportConfig("ovh", { ...synthetic, SMTP_USER: "technical-id", SMTP_FROM: "sender@example.test" }).configured, true);
  assert.deepEqual(validateRecipients(["Equipe@EXAMPLE.test", "equipe@example.test", "two@example.test"]), ["equipe@example.test", "two@example.test"]);
  assert.deepEqual(validateRecipients(["one@example.test", "invalid"]), [], "Une adresse invalide ne disparait pas silencieusement");
  assert.deepEqual(notificationLogDetails({ reason: "secret-should-not-appear", recipientCount: -2, leadId: "<unsafe>" }), { recipientCount: null, acceptedCount: null, rejectedCount: null, reason: "Detail technique non classe", leadId: null });
  const keys = ["SMTP_USER", "SMTP_PASSWORD", "SMTP_HOST", "SMTP_PORT", "SMTP_SECURE", "SMTP_FROM", "BREVO_SENDER_EMAIL", "ADMIN_EMAIL", "ADMIN_PASSWORD", "DATABASE_URL"];
  const environment = new Map(keys.map(key => [key, process.env[key]]));
  const original = { transport: nodemailer.createTransport, fetch: globalThis.fetch, update: prisma.webhookEvent.update, settings: prisma.siteSettings.findUnique };
  let mode = "all", sends = 0, closed = 0, sender = "", resultStatus = "";
  try {
    Object.assign(process.env, synthetic, { SMTP_HOST: "smtp.example.test", SMTP_FROM: "", SMTP_SECURE: "true", BREVO_SENDER_EMAIL: "different@example.test", ADMIN_EMAIL: "admin@example.test", ADMIN_PASSWORD: "notification-tests-only", DATABASE_URL: "postgresql://test-unused.invalid/test" });
    globalThis.fetch = (async () => { throw new Error("No external network allowed in test"); }) as typeof fetch;
    nodemailer.createTransport = (() => ({ sendMail: async (input: { from: string }) => { sends++; sender = input.from; if (mode === "error") throw new Error("Synthetic transport failure"); return { accepted: mode === "none" ? [] : mode === "partial" ? ["one@example.test"] : ["one@example.test", "two@example.test"], rejected: mode === "none" ? ["one@example.test", "two@example.test"] : mode === "partial" ? ["two@example.test"] : [] }; }, close: () => { closed++; } })) as unknown as typeof nodemailer.createTransport;
    prisma.webhookEvent.update = (async (args: { data: { status: string } }) => { resultStatus = args.data.status; return {}; }) as unknown as typeof prisma.webhookEvent.update;
    const input = { recipients: ["one@example.test", "two@example.test"], subject: "Test only", text: "Synthetic message", html: "<p>Synthetic message</p>" };
    const complete = await deliverNotificationEmail(input, { provider: "smtp" }); assert.equal(complete.ok, true); assert.equal(complete.acceptedCount, 2); assert.equal(sender, "sender@example.test", "L'expediteur SMTP reste distinct du sender Brevo");
    mode = "partial"; const partial = await deliverNotificationEmail(input, { provider: "smtp" }); assert.equal(partial.ok, false); assert.equal(partial.partial, true); assert.equal(partial.rejectedCount, 1);
    assert.equal(await recordNotificationOutcome("double-id", partial, { recipientCount: 2 }), true); assert.equal(resultStatus, "partial");
    mode = "none"; assert.equal((await deliverNotificationEmail(input, { provider: "smtp" })).reason, "all_recipients_rejected");
    mode = "error"; assert.equal((await deliverNotificationEmail(input, { provider: "smtp" })).reason, "transport_failed"); assert.equal(closed, sends, "Transport ferme pour succes, refus et panne");
    prisma.webhookEvent.update = (async () => { throw new Error("Synthetic log failure"); }) as typeof prisma.webhookEvent.update;
    assert.equal(await recordNotificationOutcome("double-id", complete, { recipientCount: 2 }), false);
    const beforeUnavailable = sends;
    prisma.siteSettings.findUnique = (async () => { throw new Error("Synthetic settings failure"); }) as typeof prisma.siteSettings.findUnique;
    assert.equal((await deliverNotificationEmail(input)).reason, "notification_settings_unavailable"); assert.equal(sends, beforeUnavailable, "Aucune expedition par defaut apres panne reglages");
    assert.equal((await GET(new NextRequest("http://localhost/api/admin/notifications"))).status, 401);
    const authorization = `Basic ${Buffer.from("admin@example.test:notification-tests-only").toString("base64")}`;
    assert.equal((await GET(new NextRequest("http://localhost/api/admin/notifications?status=invented", { headers: { authorization } }))).status, 400);
  } finally {
    nodemailer.createTransport = original.transport; globalThis.fetch = original.fetch; prisma.webhookEvent.update = original.update; prisma.siteSettings.findUnique = original.settings;
    for (const [key, value] of environment) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    await prisma.$disconnect();
  }
  console.log("PASS : SMTP configuration et expediteur, 1-plusieurs destinataires, refus partiel/complet, fermeture transport, resultat journal, panne preferences sans envoi et auth journal. Doubles uniquement, aucun reseau ni email reel.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
