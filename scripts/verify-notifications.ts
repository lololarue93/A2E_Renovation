import assert from "node:assert/strict";
import nodemailer from "nodemailer";
import { NextRequest } from "next/server";
import { prisma } from "../src/lib/db/prisma";
import { emailTransportConfig } from "../src/lib/email/transport-config";
import { deliverNotificationEmail, recordNotificationOutcome, sendLeadNotification, validateRecipients } from "../src/lib/email/send-lead-notification";
import { sendContactNotification } from "../src/lib/email/send-contact-notification";
import { notificationLogDetails } from "../src/lib/admin/notification-log";
import { GET } from "../src/app/api/admin/notifications/route";
import { GET as getEstimatePdf } from "../src/app/api/estimate/pdf/route";

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
  const original = { transport: nodemailer.createTransport, fetch: globalThis.fetch, create: prisma.webhookEvent.create, update: prisma.webhookEvent.update, settings: prisma.siteSettings.findUnique, estimate: prisma.estimate.findUnique };
  let mode = "all", sends = 0, closed = 0, sender = "", resultStatus = "";
  let lastMail: { replyTo?: string; html?: string; text?: string } = {};
  try {
    Object.assign(process.env, synthetic, { SMTP_HOST: "smtp.example.test", SMTP_FROM: "", SMTP_SECURE: "true", BREVO_SENDER_EMAIL: "different@example.test", ADMIN_EMAIL: "admin@example.test", ADMIN_PASSWORD: "notification-tests-only", DATABASE_URL: "postgresql://test-unused.invalid/test" });
    globalThis.fetch = (async () => { throw new Error("No external network allowed in test"); }) as typeof fetch;
    nodemailer.createTransport = (() => ({ sendMail: async (input: { from: string; replyTo?: string; html?: string; text?: string }) => { sends++; sender = input.from; lastMail = input; if (mode === "error") throw new Error("Synthetic transport failure"); return { accepted: mode === "none" ? [] : mode === "partial" ? ["one@example.test"] : ["one@example.test", "two@example.test"], rejected: mode === "none" ? ["one@example.test", "two@example.test"] : mode === "partial" ? ["two@example.test"] : [] }; }, close: () => { closed++; } })) as unknown as typeof nodemailer.createTransport;
    prisma.webhookEvent.update = (async (args: { data: { status: string } }) => { resultStatus = args.data.status; return {}; }) as unknown as typeof prisma.webhookEvent.update;
    const input = { recipients: ["one@example.test", "two@example.test"], subject: "Test only", text: "Synthetic message", html: "<p>Synthetic message</p>" };
    const complete = await deliverNotificationEmail(input, { provider: "smtp" }); assert.equal(complete.ok, true); assert.equal(complete.acceptedCount, 2); assert.equal(sender, "sender@example.test", "L'expediteur SMTP reste distinct du sender Brevo");
    mode = "partial"; const partial = await deliverNotificationEmail(input, { provider: "smtp" }); assert.equal(partial.ok, false); assert.equal(partial.partial, true); assert.equal(partial.rejectedCount, 1);
    assert.equal(await recordNotificationOutcome("double-id", partial, { recipientCount: 2 }), true); assert.equal(resultStatus, "partial");
    mode = "none"; assert.equal((await deliverNotificationEmail(input, { provider: "smtp" })).reason, "all_recipients_rejected");
    mode = "error"; assert.equal((await deliverNotificationEmail(input, { provider: "smtp" })).reason, "transport_failed"); assert.equal(closed, sends, "Transport ferme pour succes, refus et panne");
    mode = "all";
    prisma.webhookEvent.create = (async () => ({})) as unknown as typeof prisma.webhookEvent.create;
    prisma.siteSettings.findUnique = (async () => ({ value: { provider: "smtp", recipients: input.recipients, events: { leadCreated: true } } })) as unknown as typeof prisma.siteSettings.findUnique;
    const requestDetails = { message: "Projet sur mesure <script>", remarks: "<img src=x>\nAcces etroit", callbackRequested: true, callbackAvailability: "Mardi <b>18 h</b>" };
    assert.equal((await sendContactNotification({ leadId: "contact-double-only", name: "Client de test", email: "", phone: "0100000000", type: "other", ...requestDetails })).sent, true);
    assert.equal(lastMail.replyTo, undefined, "Sans email client le Reply-To est omis, jamais vide");
    assert.ok(lastMail.text?.includes("Acces etroit")); assert.ok(lastMail.text?.includes("Mardi <b>18 h</b>")); assert.ok(lastMail.text?.includes("a confirmer avec le client"));
    assert.ok(lastMail.html?.includes("&lt;script&gt;")); assert.ok(lastMail.html?.includes("&lt;img src=x&gt;<br>Acces etroit")); assert.ok(lastMail.html?.includes("&lt;b&gt;18 h&lt;/b&gt;")); assert.ok(!lastMail.html?.includes("Budget"));
    assert.equal((await sendLeadNotification({ name: "Client simulateur", email: "client@example.test", phone: "0100000000", low: 100, mid: 200, high: 300, event: "leadCreated", ...requestDetails }, "estimate-double-only")).sent, true);
    assert.equal(lastMail.replyTo, "client@example.test"); assert.ok(lastMail.text?.includes("Projet sur mesure <script>")); assert.ok(lastMail.text?.includes("Acces etroit")); assert.ok(lastMail.html?.includes("&lt;b&gt;18 h&lt;/b&gt;"));
    // Le seul evenement PDF doit aussi transmettre le besoin sauvegarde, jamais des cles JSON arbitraires.
    prisma.siteSettings.findUnique = (async (args: { where: { key: string } }) => args.where.key === "notifications" ? { value: { provider: "smtp", recipients: input.recipients, events: { leadCreated: false, pdfGenerated: true } } } : null) as unknown as typeof prisma.siteSettings.findUnique;
    let pdfLead: { name: string; email: string; phone: string; city: string; project: { details: unknown } | null } | null = { name: "Client PDF conserve", email: "client@example.test", phone: "0100000000", city: "Melun", project: { details: { ...requestDetails, name: "Nom injecte", email: "injection@example.test", low: 0 } } };
    let pdfInclude: unknown;
    prisma.estimate.findUnique = (async (args: { include: unknown }) => { pdfInclude = args.include; return { number: "A2E-TEST-PDF", createdAt: new Date("2026-10-19T10:00:00Z"), low: 100, mid: 200, high: 300, duration: "A confirmer", complexity: "Standard", assumptions: [], lines: [], lead: pdfLead }; }) as unknown as typeof prisma.estimate.findUnique;
    const pdfRequest = () => new NextRequest("http://localhost/api/estimate/pdf?estimateId=estimate-pdf-double-only");
    let beforePdf = sends;
    const pdfResponse = await getEstimatePdf(pdfRequest()); assert.equal(pdfResponse.status, 200); assert.equal(pdfResponse.headers.get("content-type"), "application/pdf"); assert.equal(sends, beforePdf + 1);
    assert.deepEqual(pdfInclude, { lead: { include: { project: { select: { details: true } } } }, lines: true });
    assert.ok(lastMail.text?.includes("Projet sur mesure <script>")); assert.ok(lastMail.text?.includes("Acces etroit")); assert.ok(lastMail.text?.includes("a confirmer avec le client")); assert.ok(lastMail.html?.includes("&lt;b&gt;18 h&lt;/b&gt;"));
    assert.ok(lastMail.text?.includes("Client PDF conserve")); assert.ok(!lastMail.text?.includes("Nom injecte")); assert.equal(lastMail.replyTo, "client@example.test");
    pdfLead.project = { details: { message: ["Incorrect"], remarks: { text: "Incorrect" }, callbackRequested: "true", callbackAvailability: "Ne pas transmettre" } };
    beforePdf = sends; assert.equal((await getEstimatePdf(pdfRequest())).status, 200); assert.equal(sends, beforePdf + 1);
    assert.ok(!lastMail.text?.includes("Incorrect")); assert.ok(!lastMail.text?.includes("Rappel demande")); assert.ok(!lastMail.text?.includes("Ne pas transmettre"));
    pdfLead.project = null; assert.equal((await getEstimatePdf(pdfRequest())).status, 200, "Un ancien dossier sans projet conserve son PDF");
    pdfLead = null; assert.equal((await getEstimatePdf(pdfRequest())).status, 200, "Un devis sans lead conserve son PDF"); assert.equal(lastMail.replyTo, undefined);
    prisma.webhookEvent.update = (async () => { throw new Error("Synthetic log failure"); }) as typeof prisma.webhookEvent.update;
    assert.equal(await recordNotificationOutcome("double-id", complete, { recipientCount: 2 }), false);
    const beforeUnavailable = sends;
    prisma.siteSettings.findUnique = (async () => { throw new Error("Synthetic settings failure"); }) as typeof prisma.siteSettings.findUnique;
    assert.equal((await deliverNotificationEmail(input)).reason, "notification_settings_unavailable"); assert.equal(sends, beforeUnavailable, "Aucune expedition par defaut apres panne reglages");
    assert.equal((await GET(new NextRequest("http://localhost/api/admin/notifications"))).status, 401);
    const authorization = `Basic ${Buffer.from("admin@example.test:notification-tests-only").toString("base64")}`;
    assert.equal((await GET(new NextRequest("http://localhost/api/admin/notifications?status=invented", { headers: { authorization } }))).status, 400);
  } finally {
    nodemailer.createTransport = original.transport; globalThis.fetch = original.fetch; prisma.webhookEvent.create = original.create; prisma.webhookEvent.update = original.update; prisma.siteSettings.findUnique = original.settings; prisma.estimate.findUnique = original.estimate;
    for (const [key, value] of environment) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    await prisma.$disconnect();
  }
  console.log("PASS : SMTP configuration et expediteur, 1-plusieurs destinataires, refus partiel/complet, fermeture transport, resultat journal, panne preferences sans envoi et auth journal. Doubles uniquement, aucun reseau ni email reel.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
