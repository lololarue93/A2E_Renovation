import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { prisma } from "../src/lib/db/prisma";
import { POST } from "../src/app/api/leads/route";
import { priceItems } from "../src/lib/pricing/price-data";
import { estimateProject, type EstimateInput } from "../src/lib/pricing/estimate-engine";

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
    assert.equal((await POST(request({ ...body, analyticsConsent: true }))).status, 200); assert.equal(eventWrites, 1);
    assert.deepEqual(event, { event: "lead_submitted", path: "/simulateur", label: "simulateur", sessionId });
    assert.equal((await POST(request({ ...body, analyticsConsent: false }))).status, 200); assert.equal(eventWrites, 1);
    assert.equal((await POST(request({ ...body, analyticsConsent: true, sessionId: "private-client" }))).status, 200); assert.equal(eventWrites, 1);
    trackingEnabled = false; assert.equal((await POST(request({ ...body, analyticsConsent: true }))).status, 200); assert.equal(eventWrites, 1);
    assert.equal(leadWrites, 5, "Le CRM conserve tous les dossiers sans dependre du choix de mesure");
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
