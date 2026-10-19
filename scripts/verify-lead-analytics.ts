import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { prisma } from "../src/lib/db/prisma";
import { POST } from "../src/app/api/leads/route";
import { priceItems } from "../src/lib/pricing/price-data";
import { estimateProject, type EstimateInput } from "../src/lib/pricing/estimate-engine";
import { notificationContent } from "../src/lib/email/notification-content";

async function main() {
  const original = { databaseUrl: process.env.DATABASE_URL, catalog: prisma.priceItem.findMany, lead: prisma.lead.create, settings: prisma.siteSettings.findUnique, analytics: prisma.siteEvent.create, webhook: prisma.webhookEvent.create, webhookUpdate: prisma.webhookEvent.update, fetch: globalThis.fetch };
  const input: EstimateInput = { projectType: "windows", projectTypes: ["windows"], city: "Saint-Denis", postalCode: "93200", finish: "standard", urgency: "normal", access: "simple", windowItems: [{ kind: "window", quantity: 2, material: "pvc", width: 100, height: 170, opening: "french", installPack: "renovation", shutter: false }] };
  const expected = estimateProject(input, priceItems), sessionId = "01234567-89ab-4cde-8fab-0123456789ab";
  const body = { name: "Client test", phone: "0100000000", email: "client@example.test", consent: true, input, result: { ...expected, low: 0, mid: 1, high: 2 }, sessionId };
  const request = (payload: unknown) => new NextRequest("http://localhost/api/leads", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
  let leadWrites = 0, eventWrites = 0, trackingEnabled = true;
  let stored: Record<string, unknown> = {}, event: Record<string, unknown> = {};
  try {
    process.env.DATABASE_URL = "postgresql://test-only.invalid/test";
    globalThis.fetch = (async () => { throw new Error("External network forbidden by this test"); }) as typeof fetch;
    prisma.priceItem.findMany = (async () => priceItems) as unknown as typeof prisma.priceItem.findMany;
    prisma.lead.create = (async (args: { data: Record<string, unknown> }) => { stored = args.data; leadWrites++; return { id: `lead-${leadWrites}`, status: "nouveau", createdAt: new Date(), typeProjet: "windows", estimates: [{ id: `estimate-${leadWrites}` }] }; }) as unknown as typeof prisma.lead.create;
    prisma.siteSettings.findUnique = (async () => ({ value: { trackingEnabled, telegramEnabled: false, events: { leadCreated: false }, recipients: ["equipe@example.test"] } })) as unknown as typeof prisma.siteSettings.findUnique;
    prisma.siteEvent.create = (async (args: { data: Record<string, unknown> }) => { eventWrites++; event = args.data; return {}; }) as unknown as typeof prisma.siteEvent.create;
    prisma.webhookEvent.create = (async () => ({})) as unknown as typeof prisma.webhookEvent.create;
    prisma.webhookEvent.update = (async () => ({})) as unknown as typeof prisma.webhookEvent.update;
    const first = await POST(request(body)); assert.equal(first.status, 200); assert.equal(eventWrites, 0); assert.equal(leadWrites, 1);
    assert.equal((await first.json()).result.mid, expected.mid, "Les prix fournis par le client sont recalcules avant sauvegarde");
    assert.equal((stored.estimates as { create: { mid: number } }).create.mid, expected.mid); assert.equal(stored.consent, true);
    const legacyDetails = (stored.project as { create: { details: Record<string, unknown> } }).create.details;
    assert.equal(legacyDetails.callbackRequested, false); assert.equal(legacyDetails.message, ""); assert.equal(legacyDetails.callbackAvailability, undefined);
    assert.equal(stored.status, undefined, "Sans rappel le statut existant n'est pas force");
    assert.equal((await POST(request({ ...body, analyticsConsent: true }))).status, 200); assert.equal(eventWrites, 1);
    assert.deepEqual(event, { event: "lead_submitted", path: "/simulateur", label: "simulateur", sessionId });
    assert.equal((await POST(request({ ...body, analyticsConsent: false }))).status, 200); assert.equal(eventWrites, 1);
    assert.equal((await POST(request({ ...body, analyticsConsent: true, sessionId: "private-client" }))).status, 200); assert.equal(eventWrites, 1);
    trackingEnabled = false; assert.equal((await POST(request({ ...body, analyticsConsent: true }))).status, 200); assert.equal(eventWrites, 1);
    assert.equal(leadWrites, 5, "Le CRM conserve tous les dossiers sans dependre du choix de mesure");
    for (const invalid of [{ message: "x".repeat(12001) }, { remarks: "x".repeat(2001) }, { callbackAvailability: "x".repeat(161) }, { callbackRequested: "true" }, { callbackRequested: true, phone: "invalid-phone" }, { email: "" }, { phone: "" }, { consent: false }]) assert.equal((await POST(request({ ...body, ...invalid }))).status, 400);
    const custom = { ...body, message: "  Extension a etudier <script>  ", remarks: "  Mur porteur a verifier  ", callbackRequested: true, callbackAvailability: "  Mardi apres 17 h  " };
    assert.equal((await POST(request(custom))).status, 200);
    const details = (stored.project as { create: { details: Record<string, unknown> } }).create.details;
    assert.equal(details.projectType, input.projectType); assert.deepEqual(details.windowItems, input.windowItems, "Les postes existants restent dans le meme details");
    assert.equal(details.message, "Extension a etudier <script>"); assert.equal(details.remarks, "Mur porteur a verifier"); assert.equal(details.callbackRequested, true); assert.equal(details.callbackAvailability, "Mardi apres 17 h");
    assert.equal(stored.status, "a_rappeler"); assert.equal(stored.nextAction, undefined); assert.equal(stored.nextActionAt, undefined);
    const notification = notificationContent({ ...custom, ...expected, remarks: "<img src=x>\nMur porteur", callbackAvailability: "Mardi <b>17 h</b>", event: "leadCreated" });
    assert.ok(notification.text.includes("Extension a etudier <script>")); assert.ok(notification.text.includes("Mur porteur")); assert.ok(notification.text.includes("a confirmer avec le client"));
    assert.ok(notification.html.includes("&lt;script&gt;")); assert.ok(notification.html.includes("&lt;img src=x&gt;<br>Mur porteur")); assert.ok(notification.html.includes("&lt;b&gt;17 h&lt;/b&gt;")); assert.ok(!notification.html.includes("<script>"));
    assert.equal((await POST(request({ ...body, callbackRequested: false, callbackAvailability: "Ne pas stocker" }))).status, 200);
    assert.equal((stored.project as { create: { details: Record<string, unknown> } }).create.details.callbackAvailability, undefined);
    trackingEnabled = true; prisma.siteEvent.create = (async () => { throw new Error("Measurement unavailable"); }) as unknown as typeof prisma.siteEvent.create;
    assert.equal((await POST(request({ ...body, analyticsConsent: true }))).status, 200, "Une panne de mesure ne perd pas le dossier");
  } finally {
    prisma.priceItem.findMany = original.catalog; prisma.lead.create = original.lead; prisma.siteSettings.findUnique = original.settings; prisma.siteEvent.create = original.analytics; prisma.webhookEvent.create = original.webhook; prisma.webhookEvent.update = original.webhookUpdate; globalThis.fetch = original.fetch;
    if (original.databaseUrl === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = original.databaseUrl;
    await prisma.$disconnect();
  }
  console.log("PASS : recalcul serveur, CRM independant du suivi, conversion avec accord explicite, labels sans identite, suivi desactive et panne analytics toleres. Stockage double ; aucune base ni livraison externe.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
