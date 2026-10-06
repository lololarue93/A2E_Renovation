import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { prisma } from "../src/lib/db/prisma";
import { POST } from "../src/app/api/contact/route";
import { contactNotificationContent, sendContactNotification } from "../src/lib/email/send-contact-notification";

async function main() {
  const content = contactNotificationContent({ leadId: "test-contact", name: "<script>alert(1)</script>", email: "test@example.test", phone: "0100000000", city: "Paris", type: "other", message: "Bonjour <img src=x onerror=alert(1)>\nNouveau projet" });
  assert.ok(!content.html.includes("<script>")); assert.ok(!content.html.includes("<img src=x")); assert.ok(content.html.includes("&lt;script&gt;")); assert.ok(!content.html.includes("Budget"), "Un message de contact n'invente aucun chiffrage");
  const original = { databaseUrl: process.env.DATABASE_URL, leadCreate: prisma.lead.create, settingsFindUnique: prisma.siteSettings.findUnique, eventCreate: prisma.siteEvent.create, webhookCreate: prisma.webhookEvent.create, webhookUpdate: prisma.webhookEvent.update };
  let saved: Record<string, unknown> | null = null;
  const records = new Map<string, { name: string; status: string; payload?: unknown }>();
  let sequence = 0;
  const input = { name: "Client de verification", email: "Client@exemple.fr", phone: "01 00 00 00 00", city: "Paris", type: "other", message: "Je souhaite presenter un projet de renovation.", consent: true, website: "", sessionId: "test-session" };
  const request = (body: unknown) => new NextRequest("http://localhost/api/contact", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  try {
    delete process.env.DATABASE_URL;
    assert.equal((await POST(request({ ...input, consent: false }))).status, 400);
    assert.equal((await POST(request({ ...input, email: "invalide" }))).status, 400);
    assert.equal((await POST(request({ ...input, message: "court" }))).status, 400);
    assert.equal((await POST(request({ ...input, message: "x".repeat(12001) }))).status, 400);
    assert.equal((await POST(request(input))).status, 503, "Sans base, aucune promesse d'enregistrement");
    process.env.DATABASE_URL = "postgresql://test-only.invalid/test";
    prisma.lead.create = (async (args: { data: Record<string, unknown> }) => { saved = args.data; return { id: "contact-test" }; }) as unknown as typeof prisma.lead.create;
    // Les envois sont desactives dans le double de test : aucune requete fournisseur.
    prisma.siteSettings.findUnique = (async () => ({ value: { events: { leadCreated: false }, recipients: ["equipe@example.test"], trackingEnabled: true } })) as unknown as typeof prisma.siteSettings.findUnique;
    prisma.siteEvent.create = (async () => ({})) as unknown as typeof prisma.siteEvent.create;
    prisma.webhookEvent.create = (async (args: { data: { id?: string; name: string; status: string } }) => { const id = args.data.id ?? `logged-${sequence++}`; if (records.has(id)) throw new Error("duplicate"); records.set(id, args.data); return { id, ...args.data }; }) as unknown as typeof prisma.webhookEvent.create;
    prisma.webhookEvent.update = (async (args: { where: { id: string }; data: { status: string; payload?: unknown } }) => { const previous = records.get(args.where.id)!; records.set(args.where.id, { ...previous, ...args.data }); return args.data; }) as unknown as typeof prisma.webhookEvent.update;
    const response = await POST(request(input)); assert.equal(response.status, 201);
    assert.equal((await response.json()).leadId, "contact-test");
    const data = saved as unknown as { sourceLead: string; email: string; consent: boolean; budget?: unknown; estimates?: unknown; project: { create: { details: { message: string } } } };
    assert.equal(data.sourceLead, "website-contact"); assert.equal(data.email, "client@exemple.fr"); assert.equal(data.consent, true);
    assert.equal(data.budget, undefined); assert.equal(data.estimates, undefined); assert.equal(data.project.create.details.message, input.message);
    assert.equal(records.get("notification-contact-contact-test")?.status, "skipped");
    const duplicate = await sendContactNotification({ leadId: "contact-test", name: input.name, email: input.email, phone: input.phone, type: input.type, message: input.message });
    assert.equal(duplicate.reason, "already_attempted_or_log_unavailable");
    prisma.lead.create = (async () => { throw new Error("Database unavailable"); }) as unknown as typeof prisma.lead.create;
    assert.equal((await POST(request(input))).status, 503);
  } finally {
    prisma.lead.create = original.leadCreate; prisma.siteSettings.findUnique = original.settingsFindUnique; prisma.siteEvent.create = original.eventCreate; prisma.webhookEvent.create = original.webhookCreate; prisma.webhookEvent.update = original.webhookUpdate;
    if (original.databaseUrl === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = original.databaseUrl;
    await prisma.$disconnect();
  }
  console.log("PASS : contact consentement/validation, stockage message sans prix artificiel, panne base, HTML echappe, journal et tentative unique. Aucun email reel ni ecriture de production.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
