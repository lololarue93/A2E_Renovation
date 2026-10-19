import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseEnv } from "node:util";
import { Prisma, PrismaClient } from "@prisma/client";
import { crmContactSchema, crmNextActionDate } from "../src/lib/admin/crm";
import { parisDayKey } from "../src/lib/admin/dashboard-metrics";
import type { LeadStatusValue } from "../src/lib/admin/lead-status";

const fixtureSet = "a2e-local-demo-prospects-v1";
export const demoProspects = [
  { id: "crm-77000000-0000-4000-8000-000000000001", city: "Melun", email: "maison.melun@prospects.example.test", status: "a_rappeler", dayOffset: -2, project: "Isolation de facade", action: "Simuler un rappel de cadrage" },
  { id: "crm-77000000-0000-4000-8000-000000000002", city: "Meaux", email: "maison.meaux@prospects.example.test", status: "visite_a_planifier", dayOffset: 0, project: "Menuiseries et ventilation", action: "Proposer des dates de visite fictive" },
  { id: "crm-77000000-0000-4000-8000-000000000003", city: "Fontainebleau", email: "maison.fontainebleau@prospects.example.test", status: "devis_a_preparer", dayOffset: 3, project: "Salle de bain", action: "Preparer une cotation de demonstration" }
] as const satisfies ReadonlyArray<{ id: string; city: string; email: string; status: LeadStatusValue; dayOffset: number; project: string; action: string }>;

function offsetParisDay(now: Date, days: number) {
  const value = new Date(`${parisDayKey(now)}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

/** Creates missing fixture IDs only. Existing contacts and their history are untouched. */
export async function importLocalDemoProspects(tx: Prisma.TransactionClient, now = new Date()) {
  const created: string[] = [], preserved: string[] = [];
  for (const fixture of demoProspects) {
    const existing = await tx.lead.findUnique({ where: { id: fixture.id }, select: { id: true } });
    if (existing) { preserved.push(existing.id); continue; }
    const contact = crmContactSchema.parse({ name: `EXEMPLE \u2014 Maison ${fixture.city}`, company: "", email: fixture.email, phone: "", city: fixture.city, typeProjet: `EXEMPLE - ${fixture.project}`, sourceLead: "manual", budget: null, consent: false });
    assert.ok(contact.email.endsWith(".example.test") && contact.phone === "" && contact.consent === false);
    await tx.lead.create({ data: { id: fixture.id, ...contact, company: null, status: fixture.status, nextAction: `EXEMPLE : ${fixture.action}`, nextActionAt: crmNextActionDate(offsetParisDay(now, fixture.dayOffset)) } });
    await tx.leadActivity.create({ data: { leadId: fixture.id, kind: "note", actor: "local-demo-prospects-import", occurredAt: now, note: "DONNEES FICTIVES DE RECETTE. Ce dossier illustre uniquement l'organisation et les relances du CRM. Aucun client reel, aucun appel ou email effectue, aucun devis ferme. Email reserve .example.test, telephone absent, consentement de contact non accorde." } });
    await tx.auditLog.create({ data: { actor: "local-demo-prospects-import", action: "lead.demo_created", entity: "Lead", entityId: fixture.id, payload: { fixtureSet, fictional: true, consent: false, noDelivery: true } } });
    created.push(fixture.id);
  }
  return { created, preserved };
}

async function main() {
  assert.equal(process.env.A2E_LOCAL_RECIPE, "true", "Set A2E_LOCAL_RECIPE=true for the isolated local recipe");
  assert.deepEqual(process.argv.slice(2), ["--import"], "Explicit --import is required");
  const local = parseEnv(await readFile(resolve(".env.local"), "utf8"));
  const database = new URL(local.DATABASE_URL ?? "");
  assert.ok(["postgresql:", "postgres:"].includes(database.protocol) && ["127.0.0.1", "localhost", "[::1]"].includes(database.hostname) && database.port === "55432" && /^\/a2e_qa_/.test(database.pathname), "Only the isolated loopback QA database on port 55432 is permitted");
  const prisma = new PrismaClient({ datasources: { db: { url: local.DATABASE_URL } } });
  try {
    const result = await prisma.$transaction(tx => importLocalDemoProspects(tx), { isolationLevel: "Serializable" });
    const rows = await prisma.lead.findMany({ where: { id: { in: demoProspects.map(fixture => fixture.id) } }, select: { id: true, name: true, status: true, nextActionAt: true } });
    assert.equal(rows.length, demoProspects.length);
    console.log(`Import local termine : ${result.created.length} exemples crees, ${result.preserved.length} dossiers existants conserves, ${rows.length} exemples presents.`);
    for (const row of rows) console.log(`${row.id} | ${row.name} | ${row.status} | ${row.nextActionAt ? parisDayKey(row.nextActionAt) : "sans echeance"}`);
    console.log("Aucune notification, aucun email, aucun evenement d'acquisition. Les autres donnees restent intactes.");
  } finally { await prisma.$disconnect(); }
}

if (require.main === module) main().catch(() => { console.error("Import local refuse ou impossible. Verifiez l'opt-in, .env.local et la base de recette ; aucun secret affiche."); process.exitCode = 1; });
