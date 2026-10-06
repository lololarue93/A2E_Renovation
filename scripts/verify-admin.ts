import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { prisma } from "../src/lib/db/prisma";
import { GET as getLeads, PATCH as patchLead } from "../src/app/api/admin/leads/route";
import { GET as getRealisations, POST as createRealisation, PUT as updateRealisation } from "../src/app/api/admin/realisations/route";
import { GET as getSettings, PUT as putSettings } from "../src/app/api/admin/settings/route";
import { dashboardPeriod, parisDayKey, parisMidnight, summarizeDashboardEvents } from "../src/lib/admin/dashboard-metrics";

async function main() {
  assert.equal(parisMidnight("2026-03-29").toISOString(), "2026-03-28T23:00:00.000Z", "Debut du jour du changement d'heure d'ete");
  assert.equal(parisMidnight("2026-03-30").toISOString(), "2026-03-29T22:00:00.000Z");
  assert.equal(parisMidnight("2026-10-25").toISOString(), "2026-10-24T22:00:00.000Z", "Debut du jour du changement d'heure d'hiver");
  assert.equal(parisMidnight("2026-10-26").toISOString(), "2026-10-25T23:00:00.000Z");
  const period = dashboardPeriod(new Date("2026-10-06T21:30:00Z"));
  assert.equal(period.keys.length, 30); assert.equal(period.keys[0], "2026-09-07"); assert.equal(period.keys[29], "2026-10-06");
  assert.equal(period.start.toISOString(), "2026-09-06T22:00:00.000Z");
  assert.equal(period.end.toISOString(), "2026-10-06T22:00:00.000Z");
  assert.equal(parisDayKey(new Date("2026-10-06T23:30:00Z")), "2026-10-07");
  const event = (name: string, sessionId: string | null, second: number) => ({ event: name, sessionId, createdAt: new Date(`2026-10-06T10:00:${String(second).padStart(2, "0")}Z`) });
  const metrics = summarizeDashboardEvents([
    event("page_view", "a", 1), event("page_view", "a", 2), event("quote_started", "a", 3), event("quote_started", "a", 4), event("lead_submitted", "a", 5), event("pdf_downloaded", "a", 6),
    event("page_view", "b", 1), event("quote_started", "b", 4),
    event("page_view", "c", 3), event("lead_submitted", "c", 1), // Hors ordre : aucune conversion attribuee.
    event("quote_started", "isolated", 1), event("lead_submitted", null, 4)
  ], period.keys);
  assert.equal(metrics.counts.page_view, 4); assert.equal(metrics.sessions, 3);
  assert.equal(metrics.startedSessions, 2); assert.equal(metrics.inquirySessions, 1);
  assert.equal(metrics.startedAndInquirySessions, 1); assert.equal(metrics.completionRate, 50);
  assert.equal(metrics.unidentified, 1); assert.equal(metrics.points[29].leads, 3);
  assert.equal(summarizeDashboardEvents([], period.keys).completionRate, null, "Un denominateur absent n'est pas transforme en zero pour cent");

  const originalEmail = process.env.ADMIN_EMAIL, originalPassword = process.env.ADMIN_PASSWORD;
  const original = { transaction: prisma.$transaction, leadFindMany: prisma.lead.findMany, leadCount: prisma.lead.count, auditFindMany: prisma.auditLog.findMany, realisationFindMany: prisma.realisation.findMany, settingsFindMany: prisma.siteSettings.findMany, settingsUpsert: prisma.siteSettings.upsert, auditCreate: prisma.auditLog.create };
  const authorization = `Basic ${Buffer.from("admin@example.test:test-admin-only").toString("base64")}`;
  const request = (path: string, method = "GET", body?: unknown, authenticated = true) => new NextRequest(`http://localhost/api/admin/${path}`, { method, headers: { ...(authenticated ? { authorization } : {}), "content-type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const audits: { id: string; action: string; entityId?: string; payload?: { note?: string }; createdAt: Date }[] = [];
  let status = "nouveau";
  const realisations: { id: string; title: string; active: boolean; [key: string]: unknown }[] = [];
  const settingsRows = new Map<string, unknown>();
  const mockAudit = async (input: { data: typeof audits[number] }) => { const item = { ...input.data, id: `audit-${audits.length}`, createdAt: new Date() }; audits.push(item); return item; };
  const tx = {
    lead: { findUnique: async (input: { where: { id: string } }) => input.where.id === "lead-1" ? { status } : null, updateMany: async (input: { where: { status: string }; data: { status: string } }) => { if (input.where.status !== status) return { count: 0 }; status = input.data.status; return { count: 1 }; } },
    auditLog: { create: mockAudit },
    realisation: { create: async (input: { data: { title: string; active: boolean } }) => { const item = { id: `real-${realisations.length + 1}`, ...input.data }; realisations.push(item); return item; }, findUnique: async (input: { where: { id: string } }) => realisations.find((item) => item.id === input.where.id) ?? null, upsert: async (input: { where: { id: string }; update: { title: string; active: boolean }; create: { id: string; title: string; active: boolean } }) => { const existing = realisations.find((item) => item.id === input.where.id); if (existing) { Object.assign(existing, input.update); return existing; } realisations.push(input.create); return input.create; } }
  };
  try {
    delete process.env.ADMIN_EMAIL; delete process.env.ADMIN_PASSWORD;
    assert.equal((await getLeads(request("leads"))).status, 503);
    assert.equal((await getRealisations(request("realisations"))).status, 503);
    assert.equal((await getSettings(request("settings"))).status, 503);
    process.env.ADMIN_EMAIL = "admin@example.test"; process.env.ADMIN_PASSWORD = "test-admin-only";
    for (const [handler, path] of [[getLeads, "leads"], [getRealisations, "realisations"], [getSettings, "settings"]] as const) assert.equal((await handler(request(path, "GET", undefined, false))).status, 401);
    assert.equal((await patchLead(request("leads", "PATCH", { id: "lead-1", status: "invente", previousStatus: "nouveau" }))).status, 400);
    assert.equal((await getLeads(request("leads?status=invente"))).status, 400);
    prisma.$transaction = (async (operation: unknown) => typeof operation === "function" ? operation(tx) : Promise.all(operation as Promise<unknown>[])) as typeof prisma.$transaction;
    prisma.lead.findMany = (async () => [{ id: "lead-1", name: "Client test", status, consent: true, estimates: [], project: null }]) as unknown as typeof prisma.lead.findMany;
    prisma.lead.count = (async () => 1) as typeof prisma.lead.count;
    prisma.auditLog.findMany = (async () => audits.filter((item) => item.action === "lead.note_added")) as unknown as typeof prisma.auditLog.findMany;
    assert.equal((await patchLead(request("leads", "PATCH", { id: "lead-1", status: "a_rappeler", previousStatus: "nouveau", note: "Visite a confirmer" }))).status, 200);
    const savedLead = await (await getLeads(request("leads?id=lead-1&consent=all"))).json();
    assert.equal(savedLead.leads[0].status, "a_rappeler"); assert.equal(savedLead.leads[0].notes[0].text, "Visite a confirmer");
    assert.equal(audits.filter((item) => item.action === "lead.status_updated").length, 1);
    assert.equal((await patchLead(request("leads", "PATCH", { id: "lead-1", status: "perdu", previousStatus: "nouveau", note: "Conflit" }))).status, 409);
    assert.equal(status, "a_rappeler"); assert.equal(audits.length, 2, "Une modification concurrente ne cree pas de note");
    assert.equal((await patchLead(request("leads", "PATCH", { id: "missing", status: "nouveau", previousStatus: "nouveau" }))).status, 404);

    prisma.realisation.findMany = (async () => realisations) as unknown as typeof prisma.realisation.findMany;
    const project = { title: "Projet de verification", city: "Paris", type: "Cuisine", description: "Description de chantier autorise pour verification.", duration: "", budget: "Sur etude", tags: ["Cuisine"], active: false };
    assert.equal((await createRealisation(request("realisations", "POST", { ...project, title: "" }))).status, 400);
    const createdResponse = await createRealisation(request("realisations", "POST", project)); assert.equal(createdResponse.status, 201);
    const created = (await createdResponse.json()).realisation;
    assert.equal(created.active, false);
    assert.equal((await updateRealisation(request("realisations", "PUT", { ...project, id: created.id, active: true }))).status, 200);
    const catalog = await (await getRealisations(request("realisations"))).json();
    assert.equal(catalog.realisations.find((item: { id: string }) => item.id === created.id).active, true, "La publication reste visible apres relecture");
    assert.equal((await updateRealisation(request("realisations", "PUT", { ...project, id: "unknown" }))).status, 404);

    prisma.siteSettings.findMany = (async () => [...settingsRows.entries()].map(([key, value]) => ({ key, value }))) as unknown as typeof prisma.siteSettings.findMany;
    prisma.siteSettings.upsert = (async (input: { where: { key: string }; update: { value: unknown } }) => { settingsRows.set(input.where.key, input.update.value); return input.update; }) as unknown as typeof prisma.siteSettings.upsert;
    prisma.auditLog.create = mockAudit as unknown as typeof prisma.auditLog.create;
    const preferences = { provider: "brevo", leadEmail: "", recipients: ["Equipe@exemple.fr", "commercial@exemple.fr", "equipe@exemple.fr"], events: { leadCreated: true, pdfGenerated: true, mediaUploaded: false, securityAlert: false }, telegramEnabled: false, trackingEnabled: true, signatureDiscountPercent: 0, signatureWindowDays: 15, phone: "01 00 00 00 00", instagram: "", facebook: "", linkedin: "" };
    assert.equal((await putSettings(request("settings", "PUT", { ...preferences, recipients: ["invalide"] }))).status, 400);
    assert.equal((await putSettings(request("settings", "PUT", { ...preferences, instagram: "javascript:alert(1)" }))).status, 400);
    assert.equal((await putSettings(request("settings", "PUT", preferences))).status, 200);
    const persisted = await (await getSettings(request("settings"))).json();
    assert.deepEqual(persisted.settings.recipients, ["equipe@exemple.fr", "commercial@exemple.fr"]);
    assert.equal(persisted.settings.signatureDiscountPercent, 0); assert.equal(persisted.saved.notifications, true); assert.equal(persisted.saved.contact, true);
    prisma.$transaction = (async () => { throw new Error("Database unavailable"); }) as typeof prisma.$transaction;
    assert.equal((await patchLead(request("leads", "PATCH", { id: "lead-1", status: "gagne", previousStatus: "a_rappeler" }))).status, 503);
    assert.equal((await createRealisation(request("realisations", "POST", project))).status, 503);
    prisma.siteSettings.findMany = (async () => { throw new Error("Database unavailable"); }) as typeof prisma.siteSettings.findMany;
    assert.equal((await getSettings(request("settings"))).status, 503, "Une panne n'est pas presentee comme des reglages initiaux");
  } finally {
    prisma.$transaction = original.transaction; prisma.lead.findMany = original.leadFindMany; prisma.lead.count = original.leadCount; prisma.auditLog.findMany = original.auditFindMany; prisma.realisation.findMany = original.realisationFindMany; prisma.siteSettings.findMany = original.settingsFindMany; prisma.siteSettings.upsert = original.settingsUpsert; prisma.auditLog.create = original.auditCreate;
    if (originalEmail === undefined) delete process.env.ADMIN_EMAIL; else process.env.ADMIN_EMAIL = originalEmail;
    if (originalPassword === undefined) delete process.env.ADMIN_PASSWORD; else process.env.ADMIN_PASSWORD = originalPassword;
    await prisma.$disconnect();
  }
  console.log("PASS : acces admin refuse, CRM statut/note/relecture/conflit, realisations brouillon/publication, multi-destinataires/0%/URL, erreurs API, KPI sessions et changements d'heure Europe/Paris. Stockage double de test, aucun email ni ecriture de production.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
