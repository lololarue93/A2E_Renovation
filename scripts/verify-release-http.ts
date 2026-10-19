import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, open, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseEnv } from "node:util";
import { Prisma, PrismaClient, type SiteSettings } from "@prisma/client";
import { PDFDocument } from "pdf-lib";
import { buildExpressProjectInput } from "../src/components/calculators/estimator-flow";
import { exportCatalogCsv } from "../src/lib/pricing/catalog-transfer";
import { estimateProject } from "../src/lib/pricing/estimate-engine";
import { priceItems, type PriceItem } from "../src/lib/pricing/price-data";

/** Local recipe only. No server startup, production credentials or external delivery. */
async function main() {
  assert.equal(process.env.A2E_LOCAL_RECIPE, "true", "Explicit local recipe opt-in required");
  const args = process.argv.slice(2);
  const initialize = args.includes("--initialize-demo-catalog");
  const urlIndex = args.indexOf("--url");
  assert.ok(args.every((arg, index) => arg === "--initialize-demo-catalog" || arg === "--url" || index === urlIndex + 1 && urlIndex >= 0), "Unknown argument");
  const base = new URL(urlIndex >= 0 ? args[urlIndex + 1] : "http://127.0.0.1:3100");
  const loopback = (hostname: string) => ["127.0.0.1", "localhost", "[::1]"].includes(hostname);
  assert.ok(base.protocol === "http:" && loopback(base.hostname) && !base.username && !base.password && base.pathname === "/" && !base.search && !base.hash, "HTTP loopback origin required");
  const local = parseEnv(await readFile(resolve(".env.local"), "utf8"));
  const database = new URL(local.DATABASE_URL ?? "");
  assert.ok(["postgresql:", "postgres:"].includes(database.protocol) && loopback(database.hostname) && database.port === "55432" && /^\/a2e_qa_/.test(database.pathname), "Isolated local QA database required");
  assert.ok(local.ADMIN_EMAIL && local.ADMIN_PASSWORD, "Private local administrator configuration required");

  const runId = randomUUID();
  const directory = resolve("docs/preview-tests");
  await mkdir(directory, { recursive: true });
  const lockPath = resolve(directory, "release-http.lock");
  const lock = await open(lockPath, "wx");
  await lock.writeFile(runId);
  const reportPath = resolve(directory, `release-http-${runId}.json`);
  const report = { runId, startedAt: new Date().toISOString(), origin: base.origin, initializedDemoCatalog: initialize, passed: false, checks: [] as Array<{ name: string; passed: boolean; details?: Record<string, unknown> }>, requests: [] as Array<{ method: string; path: string; status: number }>, cleanup: false };
  const prisma = new PrismaClient({ datasources: { db: { url: local.DATABASE_URL } } });
  let currentCheck = "initialization";
  let cookie = "";
  const notificationState: { original: SiteSettings | null; captured: boolean } = { original: null, captured: false };
  const fixtureEmail = `release-http-${runId}@example.invalid`;
  const crmId = `crm-${runId}`;
  const priceKey = `qa_http_${runId.replaceAll("-", "")}`;
  const guardKey = `qa_guard_${runId.replaceAll("-", "")}`;
  let fixturePriceId: string | undefined;
  const leadIds = new Set<string>([crmId]);
  const estimateIds = new Set<string>();
  const inputJson = (value: Prisma.JsonValue) => value === null ? Prisma.JsonNull : value as Prisma.InputJsonValue;
  const request = async (path: string, method = "GET", body?: unknown, authenticated = false, origin = base.origin, raw = false) => {
    const response = await fetch(new URL(path, base), { method, redirect: "manual", signal: AbortSignal.timeout(30_000), headers: { ...(body === undefined ? {} : { "content-type": raw ? "text/csv" : "application/json" }), ...(authenticated ? { cookie } : {}), ...(["GET", "HEAD"].includes(method) ? {} : { origin }) }, ...(body === undefined ? {} : { body: raw ? String(body) : JSON.stringify(body) }) });
    report.requests.push({ method, path: new URL(path, base).pathname, status: response.status });
    return response;
  };
  const check = async (name: string, operation: () => Promise<Record<string, unknown> | void>) => {
    currentCheck = name;
    const details = await operation();
    report.checks.push({ name, passed: true, ...(details ? { details } : {}) });
  };
  const status = (response: Response, expected: number) => assert.equal(response.status, expected, `${currentCheck}: HTTP status`);
  const muted = { provider: "brevo", recipients: [fixtureEmail], events: { leadCreated: false, pdfGenerated: false, mediaUploaded: false, securityAlert: false }, telegramEnabled: false, trackingEnabled: false, signatureDiscountPercent: 0, signatureWindowDays: 15 };
  const assertMuted = async () => assert.deepEqual((await prisma.siteSettings.findUniqueOrThrow({ where: { key: "notifications" } })).value, muted);

  try {
    await check("notification isolation", async () => {
      notificationState.original = await prisma.siteSettings.findUnique({ where: { key: "notifications" } });
      notificationState.captured = true;
      await prisma.siteSettings.upsert({ where: { key: "notifications" }, update: { value: muted }, create: { key: "notifications", value: muted } });
      await assertMuted();
    });
    await check("HTTP session and origin protection", async () => {
      const denied = await request("/admin"); status(denied, 307);
      assert.equal(new URL(denied.headers.get("location")!, base).pathname, "/admin/connexion");
      status(await request("/api/admin/pricing"), 401);
      const login = await request("/api/auth/admin", "POST", { email: local.ADMIN_EMAIL, password: local.ADMIN_PASSWORD }); status(login, 200);
      assert.equal((await login.json()).ok, true);
      const setCookie = login.headers.getSetCookie().find(value => value.startsWith("a2e_admin_session="));
      assert.ok(setCookie && /;\s*HttpOnly/i.test(setCookie) && /;\s*SameSite=Strict/i.test(setCookie));
      cookie = setCookie.split(";")[0];
      status(await request("/admin", "GET", undefined, true), 200);
      status(await request("/api/admin/pricing", "PUT", {}, true, "https://cross-origin.example.invalid"), 403);
    });
    await check("HTTP server uses the guarded local database", async () => {
      // Prove server/database identity before any valid HTTP data mutation.
      // A loopback web server could otherwise have been started with another DB.
      await prisma.priceItem.create({ data: { key: guardKey, category: "electricity", label: `QA guard ${runId}`, unit: "point", low: 1, mid: 2, high: 3 } });
      const response = await request("/api/admin/pricing", "GET", undefined, true); status(response, 200);
      const catalog = await response.json();
      assert.equal(catalog.source, "database");
      assert.ok(catalog.items.some((item: { key: string }) => item.key === guardKey), "HTTP server must see the UUID marker in the guarded local database");
      await prisma.priceItem.delete({ where: { key: guardKey } });
    });
    if (initialize) await check("explicit local demo catalogue import", async () => {
      const imported = await request("/api/admin/pricing/import", "POST", exportCatalogCsv(priceItems), true, base.origin, true); status(imported, 200);
      const outcome = await imported.json(); assert.equal(outcome.ok, true); assert.equal(outcome.created + outcome.updated, priceItems.length);
      const saved = await prisma.priceItem.findMany({ where: { key: { in: priceItems.map(item => item.key) }, active: true } });
      assert.equal(saved.length, priceItems.length);
      for (const item of priceItems) { const row = saved.find(row => row.key === item.key)!; assert.equal(row.mid, item.mid); assert.equal(row.description ?? "", item.description ?? ""); }
      return { references: saved.length, descriptions: saved.filter(item => item.description?.trim()).length };
    });
    await check("centime price PUT and reread", async () => {
      const fixture = { ...priceItems.find(item => item.category === "electricity")!, key: priceKey, label: `QA HTTP ${runId}`, low: 20, mid: 30, high: 40 };
      const created = await request("/api/admin/pricing", "POST", fixture, true); status(created, 201);
      fixturePriceId = (await created.json()).item.id;
      const edited = { ...fixture, low: 17.5, mid: 27.5, high: 37.5 };
      const updated = await request("/api/admin/pricing", "PUT", edited, true); status(updated, 200);
      const saved = (await updated.json()).item;
      for (const field of ["low", "mid", "high"] as const) assert.equal(saved[field], edited[field]);
      for (const endpoint of ["/api/admin/pricing", "/api/pricing"]) {
        const response = await request(endpoint, "GET", undefined, endpoint.includes("/admin/")); status(response, 200);
        const payload = await response.json();
        const row = (Array.isArray(payload) ? payload : payload.items).find((item: PriceItem) => item.key === priceKey);
        assert.ok(row);
        for (const field of ["low", "mid", "high"] as const) assert.equal(row[field], edited[field]);
      }
      status(await request("/api/admin/pricing", "PUT", fixture, true), 200);
      const restored = await prisma.priceItem.findUniqueOrThrow({ where: { key: priceKey } });
      for (const field of ["low", "mid", "high"] as const) assert.equal(restored[field], fixture[field]);
    });
    await check("CRM HTTP transactions and conflicts", async () => {
      const body = { requestId: runId, contact: { name: "", company: `QA HTTP ${runId}`, email: fixtureEmail, phone: "0100000000", city: "Paris", typeProjet: "Isolation", sourceLead: "manual", budget: null, consent: false }, nextAction: "Appeler pour cadrer", nextActionDate: "2026-10-20", note: `QA note ${runId}` };
      const created = await request("/api/admin/leads", "POST", body, true); status(created, 201); assert.equal((await created.json()).lead.id, crmId);
      status(await request("/api/admin/leads", "POST", body, true), 200);
      status(await request("/api/admin/leads", "POST", { ...body, note: "Changed retry" }, true), 409);
      const patch = { id: crmId, status: "a_rappeler", previousStatus: "nouveau", expectedVersion: 0, nextAction: "Organiser une visite", nextActionDate: "2026-10-22", activity: { kind: "call", note: `QA call ${runId}`, occurredAt: new Date().toISOString() } };
      status(await request("/api/admin/leads", "PATCH", patch, true), 200);
      status(await request("/api/admin/leads", "PATCH", patch, true), 409);
      const response = await request(`/api/admin/leads?id=${crmId}&consent=all`, "GET", undefined, true); status(response, 200);
      const result = await response.json(); assert.equal(result.total, 1);
      const lead = result.leads[0]; assert.equal(lead.crmVersion, 1); assert.equal(lead.status, "a_rappeler"); assert.equal(lead.consent, false); assert.equal(lead.nextActionAt, "2026-10-21T22:00:00.000Z"); assert.equal(lead.activities.length, 2);
      assert.ok(lead.activities.some((activity: { kind: string; note: string }) => activity.kind === "call" && activity.note === patch.activity.note));
      assert.equal(await prisma.lead.count({ where: { id: crmId } }), 1);
    });
    await check("specific contact project, callback and email-only contact", async () => {
      await assertMuted();
      const brief = { message: `Projet specifique QA ${runId}\nReprendre un placard sous escalier sans chiffrage automatique.`, remarks: "Acces par une cour.\nConserver les equipements existants.", callbackRequested: true, callbackAvailability: "En semaine apres 17 h\nA convenir par telephone." };
      const payload = { name: `QA contact ${runId}`, email: fixtureEmail, phone: "0100000000", city: "Melun", type: "other", ...brief, consent: true, analyticsConsent: false, sessionId: runId };
      const countBefore = await prisma.lead.count({ where: { email: fixtureEmail, sourceLead: "website-contact" } });
      status(await request("/api/contact", "POST", { ...payload, phone: "" }), 400);
      assert.equal(await prisma.lead.count({ where: { email: fixtureEmail, sourceLead: "website-contact" } }), countBefore, "A callback without a phone must not create a contact");

      const response = await request("/api/contact", "POST", payload); status(response, 201);
      const submitted = await response.json(); assert.equal(submitted.ok, true); assert.ok(submitted.leadId);
      leadIds.add(submitted.leadId);
      const stored = await prisma.lead.findUniqueOrThrow({ where: { id: submitted.leadId }, include: { project: true, estimates: true } });
      assert.equal(stored.email, fixtureEmail); assert.equal(stored.phone, payload.phone); assert.equal(stored.status, "a_rappeler");
      assert.equal(stored.nextAction, null); assert.equal(stored.nextActionAt, null, "No callback appointment is fabricated");
      assert.equal(stored.budget, null); assert.equal(stored.estimates.length, 0, "A bespoke contact has no invented price or estimate");
      assert.equal(stored.typeProjet, "other"); assert.ok(stored.project);
      const details = stored.project.details;
      assert.ok(details && typeof details === "object" && !Array.isArray(details));
      for (const field of ["message", "remarks", "callbackRequested", "callbackAvailability"] as const) assert.equal(details[field], brief[field]);
      const rereadResponse = await request(`/api/admin/leads?id=${stored.id}&consent=all`, "GET", undefined, true); status(rereadResponse, 200);
      const reread = await rereadResponse.json(); assert.equal(reread.total, 1);
      assert.equal(reread.leads[0].status, "a_rappeler"); assert.equal(reread.leads[0].nextActionAt, null); assert.equal(reread.leads[0].estimates.length, 0);
      for (const field of ["message", "remarks", "callbackRequested", "callbackAvailability"] as const) assert.equal(reread.leads[0].project.details[field], brief[field]);

      const emailOnlyResponse = await request("/api/contact", "POST", { ...payload, name: `QA email only ${runId}`, phone: "", callbackRequested: false, callbackAvailability: "" }); status(emailOnlyResponse, 201);
      const emailOnlySubmitted = await emailOnlyResponse.json(); assert.equal(emailOnlySubmitted.ok, true); assert.ok(emailOnlySubmitted.leadId);
      leadIds.add(emailOnlySubmitted.leadId);
      const emailOnly = await prisma.lead.findUniqueOrThrow({ where: { id: emailOnlySubmitted.leadId }, include: { project: true, estimates: true } });
      assert.equal(emailOnly.email, fixtureEmail); assert.equal(emailOnly.phone, ""); assert.equal(emailOnly.status, "nouveau");
      assert.equal(emailOnly.nextActionAt, null); assert.equal(emailOnly.estimates.length, 0); assert.equal(emailOnly.budget, null);
      assert.ok(emailOnly.project?.details && typeof emailOnly.project.details === "object" && !Array.isArray(emailOnly.project.details));
      assert.equal(emailOnly.project.details.callbackRequested, false); assert.equal(emailOnly.project.details.callbackAvailability, undefined);
      await assertMuted();
      const attempts = await prisma.webhookEvent.findMany({ where: { name: { startsWith: "notification." }, payload: { path: ["leadId"], equals: stored.id } } });
      assert.ok(attempts.length > 0); assert.ok(attempts.every(attempt => attempt.status === "skipped"), "Muted contact notifications must never enter delivery");
      assert.equal(await prisma.siteEvent.count({ where: { sessionId: runId } }), 0);
      return { callbackSaved: true, appointmentFabricated: false, clientRemarksPreserved: true, emailOnlyAccepted: true, estimateCreated: false };
    });
    await check("four sockets server recomputation and PDF", async () => {
      await assertMuted();
      const catalogResponse = await request("/api/pricing"); status(catalogResponse, 200);
      const catalog = await catalogResponse.json() as PriceItem[];
      const input = { ...buildExpressProjectInput("electricity", 4), city: "Paris", postalCode: "75010" };
      const expected = estimateProject(input, catalog);
      assert.equal(expected.lines.length, 1); assert.equal(expected.lines[0].quantity, 4);
      const brief = { message: `Projet de quatre prises QA ${runId}\nPreciser les passages de cable pendant le rappel.`, remarks: "Conserver la peinture.\nLogement occupe.", callbackRequested: true, callbackAvailability: "Le matin entre 9 h et 11 h." };
      const payload = { name: `QA HTTP ${runId}`, email: fixtureEmail, phone: "0100000000", ...brief, consent: true, analyticsConsent: false, sessionId: runId, input, result: { low: 1, mid: 1, high: 1, duration: "forged", complexity: "forged", maturityScore: 0, lines: [], assumptions: [] } };
      status(await request("/api/leads", "POST", { ...payload, consent: false }), 400);
      assert.equal(await prisma.lead.count({ where: { email: fixtureEmail, sourceLead: "website-simulator" } }), 0);
      const submittedResponse = await request("/api/leads", "POST", payload); status(submittedResponse, 200);
      const submitted = await submittedResponse.json();
      leadIds.add(submitted.leadId); estimateIds.add(submitted.estimateId);
      assert.equal(submitted.ok, true); assert.equal(submitted.emailSent, false); assert.equal(submitted.status, "a_rappeler");
      for (const field of ["low", "mid", "high"] as const) assert.equal(submitted.result[field], expected[field]);
      assert.notEqual(submitted.result.mid, 1);
      const stored = await prisma.estimate.findUniqueOrThrow({ where: { id: submitted.estimateId }, include: { lead: { include: { project: true } }, lines: true } });
      assert.equal(stored.lead?.email, fixtureEmail); assert.equal(stored.mid, expected.mid); assert.equal(stored.lines.length, 1); assert.equal(stored.lines[0].quantity, 4);
      assert.equal(stored.lead?.status, "a_rappeler"); assert.equal(stored.lead?.nextActionAt, null);
      const details = stored.lead?.project?.details;
      assert.ok(details && typeof details === "object" && !Array.isArray(details));
      for (const field of ["message", "remarks", "callbackRequested", "callbackAvailability"] as const) assert.equal(details[field], brief[field]);
      const rereadResponse = await request(`/api/admin/leads?id=${submitted.leadId}&consent=all`, "GET", undefined, true); status(rereadResponse, 200);
      const reread = await rereadResponse.json(); assert.equal(reread.total, 1);
      assert.equal(reread.leads[0].status, "a_rappeler"); assert.equal(reread.leads[0].nextActionAt, null);
      for (const field of ["message", "remarks", "callbackRequested", "callbackAvailability"] as const) assert.equal(reread.leads[0].project.details[field], brief[field]);
      const pdf = await request(`/api/estimate/pdf?estimateId=${stored.id}`); status(pdf, 200);
      assert.ok(pdf.headers.get("content-type")?.includes("application/pdf"));
      const document = await PDFDocument.load(await pdf.arrayBuffer()); assert.ok(document.getPageCount() >= 1);
      await assertMuted();
      const attempts = await prisma.webhookEvent.findMany({ where: { name: { startsWith: "notification." }, payload: { path: ["estimateId"], equals: stored.id } } });
      assert.equal(attempts.length, 2, "Disabled lead/PDF notifications remain inspectable, one attempt each");
      assert.ok(attempts.every(attempt => attempt.status === "skipped"), "Muted notifications must never enter delivery");
      assert.equal(await prisma.siteEvent.count({ where: { sessionId: runId } }), 0);
      return { quantity: 4, lines: stored.lines.length, pdfPages: document.getPageCount(), serverRecomputed: true, emailSent: false };
    });
    await check("HTTP logout cookie", async () => {
      const response = await request("/api/auth/admin", "DELETE", undefined, true); status(response, 200);
      assert.ok(response.headers.getSetCookie().some(value => value.startsWith("a2e_admin_session=") && /Max-Age=0/i.test(value)));
    });
    report.passed = true;
  } catch {
    report.checks.push({ name: currentCheck, passed: false });
  } finally {
    let cleanupOkay = true;
    try {
      // Only UUID fixture contacts, their dependants and the UUID price are removed.
      const fixtures = await prisma.lead.findMany({ where: { OR: [{ id: crmId }, { email: fixtureEmail }] }, select: { id: true, estimates: { select: { id: true } } } });
      for (const lead of fixtures) { leadIds.add(lead.id); for (const estimate of lead.estimates) estimateIds.add(estimate.id); }
      for (const id of leadIds) await prisma.webhookEvent.deleteMany({ where: { payload: { path: ["leadId"], equals: id } } });
      for (const id of estimateIds) await prisma.webhookEvent.deleteMany({ where: { payload: { path: ["estimateId"], equals: id } } });
      await prisma.estimate.deleteMany({ where: { id: { in: [...estimateIds] } } });
      await prisma.lead.deleteMany({ where: { id: { in: [...leadIds] } } });
      await prisma.auditLog.deleteMany({ where: { entity: "Lead", entityId: { in: [...leadIds] } } });
      await prisma.siteEvent.deleteMany({ where: { sessionId: runId } });
      if (!fixturePriceId) fixturePriceId = (await prisma.priceItem.findUnique({ where: { key: priceKey } }))?.id;
      if (fixturePriceId) await prisma.auditLog.deleteMany({ where: { entity: "PriceItem", entityId: fixturePriceId } });
      await prisma.priceItem.deleteMany({ where: { key: priceKey } });
      await prisma.priceItem.deleteMany({ where: { key: guardKey } });
      assert.equal(await prisma.lead.count({ where: { email: fixtureEmail } }), 0);
      assert.equal(await prisma.priceItem.count({ where: { key: priceKey } }), 0);
      assert.equal(await prisma.priceItem.count({ where: { key: guardKey } }), 0);
    } catch { cleanupOkay = false; report.checks.push({ name: "UUID fixture cleanup", passed: false }); }
    // Restore delivery settings even if a separate fixture cleanup failed.
    try {
      if (notificationState.captured) {
        if (notificationState.original) {
          await prisma.siteSettings.update({ where: { key: "notifications" }, data: { value: inputJson(notificationState.original.value) } });
          assert.deepEqual(await prisma.siteSettings.findUnique({ where: { key: "notifications" } }), notificationState.original);
        } else {
          await prisma.siteSettings.delete({ where: { key: "notifications" } });
          assert.equal(await prisma.siteSettings.count({ where: { key: "notifications" } }), 0);
        }
      }
    } catch { cleanupOkay = false; report.checks.push({ name: "exact notification restore", passed: false }); }
    report.cleanup = cleanupOkay;
    if (!cleanupOkay) report.passed = false;
    await prisma.$disconnect();
    await writeFile(reportPath, JSON.stringify({ ...report, completedAt: new Date().toISOString() }, null, 2));
    await lock.close();
    await rm(lockPath);
  }
  console.log(`${report.passed ? "PASS" : "FAIL"} release HTTP: ${report.checks.filter(check => check.passed).length} checks; cleanup ${report.cleanup ? "verified" : "FAILED"}. Report: ${reportPath}`);
  if (!report.passed) { console.error(`Failed check: ${report.checks.find(check => !check.passed)?.name}. No credentials or response bodies logged.`); process.exitCode = 1; }
}

main().catch(() => { console.error("Release HTTP verification aborted by its local guard or initialization. No credentials logged."); process.exitCode = 1; });
