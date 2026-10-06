import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { PDFDocument } from "pdf-lib";
import { prisma } from "../src/lib/db/prisma";
import { GET as exportLeads } from "../src/app/api/admin/export/leads/route";
import { GET as exportReport } from "../src/app/api/admin/export/report/route";
import { exportLeadFilters } from "../src/lib/admin/export-filters";
import { parseDelimited } from "../src/lib/pricing/catalog-transfer";

async function main() {
  const winter = exportLeadFilters(new URLSearchParams("from=2026-10-25&to=2026-10-25"));
  assert.ok(winter.ok);
  if (winter.ok) assert.deepEqual(winter.where.createdAt, { gte: new Date("2026-10-24T22:00:00Z"), lt: new Date("2026-10-25T23:00:00Z") }, "Le jour d'hiver de Paris comprend ses 25 heures");
  const summer = exportLeadFilters(new URLSearchParams("from=2026-03-29&to=2026-03-29"));
  assert.ok(summer.ok);
  if (summer.ok) assert.deepEqual(summer.where.createdAt, { gte: new Date("2026-03-28T23:00:00Z"), lt: new Date("2026-03-29T22:00:00Z") }, "Le jour d'ete de Paris comprend ses 23 heures");
  for (const invalid of ["status=invente", "type=invente", "consent=all", "from=2026-02-31", "to=2026-13-01", "from=2026-10-07&to=2026-10-06", "from=hier"]) assert.equal(exportLeadFilters(new URLSearchParams(invalid)).ok, false);

  const email = process.env.ADMIN_EMAIL, password = process.env.ADMIN_PASSWORD, originalFind = prisma.lead.findMany;
  let queries = 0;
  const selected: unknown[] = [];
  const credentials = `Basic ${Buffer.from("admin@example.test:export-test-only").toString("base64")}`;
  const request = (path: string, auth = "") => new NextRequest(`http://localhost/api/admin/export/${path}`, { headers: auth ? { authorization: auth } : {} });
  try {
    prisma.lead.findMany = (async (args: { where: unknown }) => { queries += 1; selected.push(args.where); return [{ id: "test-private", name: "=HYPERLINK(\"https://example.test\")", email: "CLIENT_PRIVATE_TO_NEVER_LEAK@example.test", phone: "+33100000000", city: "\t=SUM(1;1)", typeProjet: "windows+insulation", status: "nouveau", consent: true, budget: null, createdAt: new Date("2026-10-06T10:00:00Z"), estimates: [] }]; }) as unknown as typeof prisma.lead.findMany;
    delete process.env.ADMIN_EMAIL; delete process.env.ADMIN_PASSWORD;
    for (const handler of [exportLeads, exportReport]) { const response = await handler(request("leads")); assert.equal(response.status, 503); assert.ok(!(await response.text()).includes("CLIENT_PRIVATE_TO_NEVER_LEAK")); }
    process.env.ADMIN_EMAIL = "admin@example.test"; process.env.ADMIN_PASSWORD = "export-test-only";
    for (const handler of [exportLeads, exportReport]) for (const auth of ["", "Basic malformed==", "Basic " + Buffer.from("admin@example.test:wrong").toString("base64")]) { const response = await handler(request("leads", auth)); assert.equal(response.status, 401); assert.ok(!(await response.text()).includes("CLIENT_PRIVATE_TO_NEVER_LEAK")); }
    assert.equal(queries, 0, "Aucune donnee confidentielle lue avant authentification");
    for (const handler of [exportLeads, exportReport]) assert.equal((await handler(request("leads?status=invente", credentials))).status, 400);
    assert.equal(queries, 0, "Les filtres invalides ne sont pas transmis a Prisma");
    const query = "consent=true&type=windows&status=nouveau&from=2026-10-06&to=2026-10-06";
    const response = await exportLeads(request(`leads?${query}`, credentials)); assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    const csv = await response.text(); const rows = parseDelimited(csv);
    assert.equal(rows[1][1], "'=HYPERLINK(\"https://example.test\")");
    assert.equal(rows[1][3], "'+33100000000"); assert.equal(rows[1][4], "'\t=SUM(1;1)");
    assert.equal(rows[1][9], "", "Aucun budget invente pour un contact a chiffrer");
    const report = await exportReport(request(`report?${query}`, credentials)); assert.equal(report.status, 200);
    assert.equal(report.headers.get("cache-control"), "private, no-store");
    assert.deepEqual(selected[0], selected[1], "CSV et PDF appliquent exactement les memes filtres");
    const document = await PDFDocument.load(await report.arrayBuffer()); assert.equal(document.getPageCount(), 1);
    prisma.lead.findMany = (async () => { throw new Error("Sensitive database detail"); }) as unknown as typeof prisma.lead.findMany;
    for (const handler of [exportLeads, exportReport]) { const failed = await handler(request("leads", credentials)); assert.equal(failed.status, 503); assert.ok(!(await failed.text()).includes("Sensitive database detail")); }
  } finally {
    prisma.lead.findMany = originalFind;
    if (email === undefined) delete process.env.ADMIN_EMAIL; else process.env.ADMIN_EMAIL = email;
    if (password === undefined) delete process.env.ADMIN_PASSWORD; else process.env.ADMIN_PASSWORD = password;
    await prisma.$disconnect();
  }
  console.log("PASS : exports proteges avant lecture, CSV sans formules executables, filtres valides/invalides et dates Paris, confidentialite, coherence PDF/CSV et panne sans detail technique. Aucun acces en base de production.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
