import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { prisma } from "../src/lib/db/prisma";
import { GET, POST, PATCH } from "../src/app/api/admin/leads/route";
import { crmContactSchema, crmDateSchema, crmDueLabel, crmDueWhere, crmDueWindow } from "../src/lib/admin/crm";

type RecordValue = Record<string, unknown>;
function matches(record: RecordValue, where: RecordValue = {}): boolean {
  return Object.entries(where).every(([field, condition]) => {
    if (field === "AND") return (condition as RecordValue[]).every(item => matches(record, item));
    if (field === "OR") return (condition as RecordValue[]).some(item => matches(record, item));
    if (condition === null || typeof condition !== "object") return record[field] === condition;
    const rule = condition as RecordValue; const value = record[field];
    if ("in" in rule && !(rule.in as unknown[]).includes(value)) return false;
    if ("contains" in rule && !String(value ?? "").toLowerCase().includes(String(rule.contains).toLowerCase())) return false;
    if ("lt" in rule && !(value instanceof Date && value < (rule.lt as Date))) return false;
    if ("gte" in rule && !(value instanceof Date && value >= (rule.gte as Date))) return false;
    return true;
  });
}
async function main() {
  assert.equal(crmDateSchema.safeParse("2026-02-30").success, false); assert.equal(crmDateSchema.safeParse("2028-02-29").success, true);
  const summer = crmDueWindow(new Date("2026-03-29T12:00:00Z")); assert.equal(summer.start.toISOString(), "2026-03-28T23:00:00.000Z"); assert.equal(summer.end.toISOString(), "2026-03-29T22:00:00.000Z");
  const winter = crmDueWindow(new Date("2026-10-25T12:00:00Z")); assert.equal(winter.end.getTime() - winter.start.getTime(), 25 * 3600_000);
  const clock = new Date("2026-10-06T10:00:00Z");
  assert.equal(crmDueLabel("2026-10-04T22:00:00Z", "a_rappeler", clock), "En retard"); assert.equal(crmDueLabel("2026-10-05T22:00:00Z", "nouveau", clock), "Aujourd’hui"); assert.equal(crmDueLabel("2026-10-06T22:00:00Z", "nouveau", clock), "À venir"); assert.equal(crmDueLabel("2026-10-04T22:00:00Z", "gagne", clock), "Dossier clôturé");
  assert.equal(matches({ status: "nouveau", nextActionAt: new Date("2026-10-05T22:00:00Z") }, crmDueWhere("today", clock) as RecordValue), true);
  assert.equal(matches({ status: "signe", nextActionAt: new Date("2026-10-05T22:00:00Z") }, crmDueWhere("today", clock) as RecordValue), false);
  const contact = { name: "", company: "Entreprise de test", email: "", phone: "06 00 00 00 00", city: "Paris", typeProjet: "Isolation", sourceLead: "manual" as const, budget: null, consent: false };
  assert.equal(crmContactSchema.safeParse(contact).success, true); assert.equal(crmContactSchema.safeParse({ ...contact, company: "" }).success, false); assert.equal(crmContactSchema.safeParse({ ...contact, phone: "" }).success, false); assert.equal(crmContactSchema.safeParse({ ...contact, email: "pas-un-mail" }).success, false);
  const originals = { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD, transaction: prisma.$transaction, findMany: prisma.lead.findMany, count: prisma.lead.count, groupBy: prisma.lead.groupBy, auditFindMany: prisma.auditLog.findMany, fetch: globalThis.fetch };
  const records: RecordValue[] = []; const activities: RecordValue[] = []; const audit: RecordValue[] = []; let reads = 0, externalRequests = 0;
  const auth = `Basic ${Buffer.from("admin@example.test:crm-test-only").toString("base64")}`;
  const request = (method = "GET", body?: unknown, params = "", authenticated = true) => new NextRequest(`http://localhost/api/admin/leads${params}`, { method, headers: { ...(authenticated ? { authorization: auth } : {}), "content-type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const findMany = async (input: { where?: RecordValue; skip?: number; take?: number }) => { reads++; return records.filter(record => matches(record, input.where)).slice(input.skip ?? 0, (input.skip ?? 0) + (input.take ?? records.length)).map(record => ({ ...record, project: null, estimates: [], activities: activities.filter(item => item.leadId === record.id).sort((first, second) => (second.occurredAt as Date).getTime() - (first.occurredAt as Date).getTime()) })); };
  const tx = {
    lead: {
      findUnique: async (input: { where: { id: string } }) => { reads++; const record = records.find(item => item.id === input.where.id); return record ? { ...record } : null; },
      create: async (input: { data: RecordValue }) => { const record = { status: "nouveau", crmVersion: 0, createdAt: new Date(), updatedAt: new Date(), ...input.data }; records.push(record); return record; },
      updateMany: async (input: { where: RecordValue; data: RecordValue }) => { const record = records.find(item => matches(item, input.where)); if (!record) return { count: 0 }; for (const [key, value] of Object.entries(input.data)) { record[key] = key === "crmVersion" ? Number(record.crmVersion) + Number((value as RecordValue).increment) : value; } return { count: 1 }; }
    },
    leadActivity: { create: async (input: { data: RecordValue }) => { const activity = { id: `activity-${activities.length}`, createdAt: new Date(), ...input.data }; activities.push(activity); return activity; } },
    auditLog: { findFirst: async (input: { where: RecordValue }) => audit.find(item => matches(item, input.where)) ?? null, create: async (input: { data: RecordValue }) => { const item = { id: `audit-${audit.length}`, createdAt: new Date(), ...input.data }; audit.push(item); return item; } }
  };
  try {
    process.env.ADMIN_EMAIL = "admin@example.test"; process.env.ADMIN_PASSWORD = "crm-test-only";
    globalThis.fetch = (async () => { externalRequests++; throw new Error("Unexpected external request"); }) as typeof fetch;
    prisma.$transaction = (async (operation: (client: typeof tx) => Promise<unknown>) => operation(tx)) as unknown as typeof prisma.$transaction;
    prisma.lead.findMany = findMany as unknown as typeof prisma.lead.findMany;
    prisma.lead.count = (async (input: { where?: RecordValue }) => { reads++; return records.filter(record => matches(record, input.where)).length; }) as unknown as typeof prisma.lead.count;
    prisma.lead.groupBy = (async (input: { where?: RecordValue }) => { reads++; const counts = new Map<string, number>(); for (const record of records.filter(item => matches(item, input.where))) counts.set(String(record.sourceLead), (counts.get(String(record.sourceLead)) ?? 0) + 1); return [...counts].map(([sourceLead, count]) => ({ sourceLead, _count: { _all: count } })); }) as unknown as typeof prisma.lead.groupBy;
    prisma.auditLog.findMany = (async () => audit.filter(item => item.action === "lead.note_added")) as unknown as typeof prisma.auditLog.findMany;
    for (const [handler, method] of [[GET, "GET"], [POST, "POST"], [PATCH, "PATCH"]] as const) assert.equal((await handler(request(method, undefined, "", false))).status, 401);
    assert.equal(reads, 0, "Refus auth avant toute lecture de donnees prospect");
    assert.equal((await GET(request("GET", undefined, "?due=invente"))).status, 400); assert.equal((await GET(request("GET", undefined, "?consent=invente"))).status, 400);
    const body = { requestId: "5d6b6e7c-c0e0-41ed-a0d6-9548f8582401", contact, nextAction: "Appeler pour cadrer le projet", nextActionDate: "2026-10-06", note: "Origine et projet renseignes par operateur." };
    assert.equal((await POST(request("POST", { ...body, contact: { ...contact, phone: "" } }))).status, 400);
    assert.equal((await POST(request("POST", { ...body, nextActionDate: null }))).status, 400);
    const createdResponse = await POST(request("POST", body)); assert.equal(createdResponse.status, 201); const created = (await createdResponse.json()).lead;
    assert.equal(created.name, contact.company); assert.equal(created.email, ""); assert.equal(created.consent, false); assert.equal(created.budget, null); assert.equal(created.nextActionAt, "2026-10-05T22:00:00.000Z");
    assert.equal((await POST(request("POST", body))).status, 200); assert.equal(records.length, 1, "Relancer la creation apres une erreur de relecture reste idempotent"); assert.equal(activities.length, 1);
    const changedCreation = await POST(request("POST", { ...body, contact: { ...contact, email: "nouvelle-saisie@example.test" }, nextActionDate: "2026-10-10", note: "Nouvelle saisie a conserver" }));
    assert.equal(changedCreation.status, 409); assert.equal((await changedCreation.json()).existingLeadId, created.id); assert.equal(records.length, 1); assert.equal(activities.length, 1, "Une nouvelle saisie ne confirme pas silencieusement le premier dossier");
    const read = await (await GET(request("GET", undefined, `?id=${created.id}&consent=all`))).json(); assert.equal(read.leads[0].company, contact.company); assert.equal(read.leads[0].activities[0].note, body.note); assert.equal(read.total, 1);
    const activity = { kind: "call", note: "Appel declare : visite a organiser.", occurredAt: "2026-10-01T08:00:00Z" };
    const patch = { id: created.id, status: "visite_a_planifier", previousStatus: "nouveau", expectedVersion: 0, nextAction: "Proposer deux dates de visite", nextActionDate: "2026-10-08", activity };
    assert.equal((await PATCH(request("PATCH", { ...patch, activity: { ...activity, occurredAt: "2100-01-01T10:00:00Z" } }))).status, 400);
    assert.equal((await PATCH(request("PATCH", patch))).status, 200);
    const reloaded = await (await GET(request("GET", undefined, `?id=${created.id}&consent=all`))).json(); assert.equal(reloaded.leads[0].status, "visite_a_planifier"); assert.equal(reloaded.leads[0].crmVersion, 1); assert.equal(reloaded.leads[0].activities.find((item: { kind: string }) => item.kind === "call").note, activity.note);
    assert.equal((await PATCH(request("PATCH", { ...patch, previousStatus: "visite_a_planifier", status: "visite_a_planifier", activity: { ...activity, kind: "email" } }))).status, 409, "Version obsolete refusee meme si statut identique"); assert.equal(activities.length, 2);
    assert.equal((await PATCH(request("PATCH", { ...patch, expectedVersion: undefined }))).status, 400);
    assert.equal((await PATCH(request("PATCH", { id: created.id, status: "a_rappeler", previousStatus: "visite_a_planifier", expectedVersion: 1, contact: { ...contact, name: "Contact modifie", email: "CONTACT@exemple.test", consent: true }, nextAction: null, nextActionDate: null, activity: { ...activity, kind: "visit", note: "Visite realisee et declaree." } }))).status, 200);
    const edited = await (await GET(request("GET", undefined, `?id=${created.id}&consent=yes`))).json(); assert.equal(edited.leads[0].email, "contact@exemple.test"); assert.equal(edited.leads[0].consent, true); assert.equal(edited.leads[0].nextActionAt, null); assert.equal(edited.leads[0].crmVersion, 2);
    const declaredEmail = await PATCH(request("PATCH", { id: created.id, status: "a_rappeler", previousStatus: "a_rappeler", expectedVersion: 2, activity: { ...activity, kind: "email", note: "Email declare apres envoi dans la messagerie habituelle." } }));
    assert.equal(declaredEmail.status, 200); assert.equal((await declaredEmail.json()).crmVersion, 3);
    const emailHistory = await (await GET(request("GET", undefined, `?id=${created.id}&consent=all`))).json(); assert.equal(emailHistory.leads[0].activities.filter((item: { kind: string }) => item.kind === "email").length, 1);
    const now = crmDueWindow(); records.push({ ...records[0], id: "web-1", name: "Demande du site", sourceLead: "website-contact", nextActionAt: new Date(now.start.getTime() - 24 * 3600_000), nextAction: "Rappeler", consent: true });
    records.push({ ...records[0], id: "closed-1", status: "gagne", nextActionAt: new Date(now.start.getTime() - 24 * 3600_000) });
    const overdue = await (await GET(request("GET", undefined, "?due=overdue&consent=all"))).json(); assert.equal(overdue.total, 1); assert.equal(overdue.leads[0].id, "web-1"); assert.equal(overdue.stats.overdue, 1);
    const bySource = await (await GET(request("GET", undefined, "?source=website-contact&consent=all"))).json(); assert.equal(bySource.total, 1); assert.equal(bySource.sources.find((item: { key: string }) => item.key === "manual").count, 2);
    const search = await (await GET(request("GET", undefined, "?search=Entreprise&consent=all"))).json(); assert.equal(search.total, 3, "Recherche entreprise sur toute la base canonique");
    assert.equal(externalRequests, 0, "Aucune relance, notification ou analytics pour les saisies CRM");
    prisma.$transaction = (async () => { throw new Error("Database offline"); }) as typeof prisma.$transaction;
    assert.equal((await POST(request("POST", body))).status, 503); assert.equal((await PATCH(request("PATCH", { id: created.id, status: "nouveau", previousStatus: "a_rappeler" }))).status, 503);
    prisma.lead.findMany = (async () => { throw new Error("Database offline"); }) as typeof prisma.lead.findMany; assert.equal((await GET(request())).status, 503);
  } finally {
    prisma.$transaction = originals.transaction; prisma.lead.findMany = originals.findMany; prisma.lead.count = originals.count; prisma.lead.groupBy = originals.groupBy; prisma.auditLog.findMany = originals.auditFindMany; globalThis.fetch = originals.fetch;
    if (originals.email === undefined) delete process.env.ADMIN_EMAIL; else process.env.ADMIN_EMAIL = originals.email;
    if (originals.password === undefined) delete process.env.ADMIN_PASSWORD; else process.env.ADMIN_PASSWORD = originals.password;
    await prisma.$disconnect();
  }
  console.log("PASS : CRM canonique, creation idempotente, nom/entreprise/email ou telephone, consentement, actions dates Paris/DST, notes/appels/visites declares, edition/relecture, conflit de version, filtres sources/relances/statuts, autorisation et 503. Aucun email, fichier ou acces base de production.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
