import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { PDFDocument } from "pdf-lib";
import { prisma } from "../src/lib/db/prisma";
import { generateEstimatePdf, type PdfEstimateLine } from "../src/lib/pdf/generate-estimate-pdf";
import { generateWorkspaceQuote } from "../src/lib/pdf/generate-workspace-quote";
import { calculateQuote, lineFromCatalog, newQuote, validateQuote } from "../src/lib/pricing/quote-workspace";
import { estimateProject } from "../src/lib/pricing/estimate-engine";

/** No live database, SMTP, notification or client data is used for these fixtures. */
async function main() {
  const output = join(process.cwd(), "docs", "preview-tests");
  await mkdir(output, { recursive: true });
  const previousSettings = prisma.siteSettings.findUnique;
  prisma.siteSettings.findUnique = (async () => null) as typeof prisma.siteSettings.findUnique;
  try {
    const estimateLines: PdfEstimateLine[] = Array.from({ length: 30 }, (_, index) => ({
      label: `ROW-EST-${String(index + 1).padStart(3, "0")} <strong>Fenetre</strong> facade étanche — 中文 🏠 ${"finition-accessibilite-".repeat(4)}`,
      quantity: 1 + index % 3, unit: index % 2 ? "m2" : "unite",
      low: 300 + index * 30, mid: 500 + index * 35, high: 800 + index * 40,
      description: 'Fourniture <script>alert("QA")</script> : menuiserie, pose, depose, raccordement et finitions. '.repeat(3),
      reference: "Reference de verification, jamais un engagement fournisseur ".repeat(2), vatRate: [5.5, 10, 20][index % 3]
    }));
    const sum = (field: "low" | "mid" | "high") => estimateLines.reduce((total, line) => total + line[field], 0);
    const estimateBytes = await generateEstimatePdf({
      name: "CLIENT-PDF-QA " + "Nom compose été 中文 🏠 ".repeat(7),
      email: "qa-pdf-" + "long-local-part-".repeat(5) + "@" + "sousdomaine.".repeat(5) + "example.test",
      phone: "TELEPHONE DE VERIFICATION", city: "Ville de recette en Ile-de-France, adresse a confirmer ".repeat(3),
      number: "A2E-EST-PDF-QA", createdAt: new Date("2026-10-06T10:00:00Z"),
      low: sum("low"), mid: sum("mid"), high: sum("high"), duration: "Planning a confirmer apres visite technique", complexity: "standard",
      discountPercent: 7.5, discountDays: 30, lines: estimateLines,
      assumptions: ["RESERVES-EST-QA Metre, acces, supports et references a confirmer. " + "Validation technique. ".repeat(15), "Aucune aide publique deduite. <em>Texte HTML affiche litteralement</em> 中文 🏠"]
    });
    const estimatePath = join(output, "estimate-30-lines.pdf");
    await writeFile(estimatePath, estimateBytes);
    const eightLots = estimateProject({ projectType: "global", projectTypes: ["windows", "insulation", "electricity", "plumbing", "global", "hvac", "kitchen_bath", "roofing"], surface: 100_000, finish: "standard", urgency: "normal", access: "simple", hvacType: "pac_air_water" });
    const largeLines: PdfEstimateLine[] = [
      { label: "ROW-LARGE-001 QA stress : surface maximale 100000 m2", quantity: 100_000, unit: "m2", low: 1_000_000_000, mid: 1_234_567_891, high: 1_987_654_321, description: "Montants de stress arithmetique, aucune cotation fournisseur." },
      { label: "ROW-LARGE-002 QA stress : montants importants sans abbreviation", quantity: 100_000, unit: "m2", low: 1_000_000_010, mid: 1_234_567_892, high: 1_987_654_322, description: "Fixture de verification de largeur et d'arrondi au centime." }
    ];
    const largeTotals = { low: 2_000_000_010, mid: 2_469_135_783, high: 3_975_308_643 };
    const largeDiscount = Math.round(largeTotals.mid * (1 - 7.5 / 100) * 100) / 100;
    const largeBytes = await generateEstimatePdf({ name: "CLIENT-LARGE-QA", number: "A2E-LARGE-PDF-QA", createdAt: new Date("2026-10-06T10:00:00Z"), ...largeTotals, duration: eightLots.duration, complexity: eightLots.complexity, lines: largeLines, discountPercent: 7.5, discountDays: 30, assumptions: ["RESERVES-LARGE-QA Fixture technique avec huit lots et montants superieurs a un milliard. Ne pas utiliser comme tarif client."] });
    await writeFile(join(output, "estimate-large-amounts.pdf"), largeBytes);

    const quote = validateQuote({
      ...newQuote(), number: "A2E-WORK-PDF-QA", date: "2026-10-06", title: "Cotation QA : 35 postes, TVA mixte et remise", basis: "ht", discountPercent: 7.5, discountReason: "Remise de verification pour regroupement des lots",
      client: "CLIENT-WORK-QA " + "Nom compose été 中文 🏠 ".repeat(4),
      email: "qa-" + "long-local-name-".repeat(3) + "@" + "sousdomaine.".repeat(5) + "example.test",
      phone: "TELEPHONE DE VERIFICATION", address: "Adresse de verification, Ile-de-France, aucun client reel",
      notes: "RESERVES-WORK-QA " + "Metre, supports, acces, raccordement et visite technique a confirmer. ".repeat(20),
      lines: Array.from({ length: 35 }, (_, index) => ({
        ...lineFromCatalog(), label: `ROW-WORK-${String(index + 1).padStart(3, "0")} <strong>Isolation</strong> facade étanche 中文 🏠`,
        unit: "m2", quantity: 1 + index % 3, useDimensions: true, width: 4.125, height: 2.65,
        low: 35 + index * 0.3, mid: 50 + index * 0.5, high: 75 + index * 0.7, vatRate: [5.5, 10, 20][index % 3],
        description: 'Fourniture <script>alert("QA")</script>, pose, supports et finitions. '.repeat(5),
        reference: "Gamme indicative QA, references a confirmer lors de la visite"
      }))
    });
    const workspaceBytes = await generateWorkspaceQuote(quote, "TELEPHONE DE VERIFICATION");
    const workspacePath = join(output, "workspace-35-lines-discount.pdf");
    await writeFile(workspacePath, workspaceBytes);
    const summary = calculateQuote(quote);
    const fixtures = [
      { filename: "estimate-30-lines.pdf", pages: (await PDFDocument.load(estimateBytes)).getPageCount(), rows: 30, marker: "ROW-EST-", required: ["CLIENT-PDF-QA", "RESERVES-EST-QA", "A2E RENOVATION", "Remise envisageable", "<script>"], totals: { low: sum("low"), mid: sum("mid"), high: sum("high") } },
      { filename: "workspace-35-lines-discount.pdf", pages: (await PDFDocument.load(workspaceBytes)).getPageCount(), rows: 35, marker: "ROW-WORK-", required: ["CLIENT-WORK-QA", "RESERVES-WORK-QA", "Avant remise", "Remise commerciale 7.5 %", "Apres remise", "Total HT", "TVA indicative", "Total TTC", "<script>"], totals: { subtotal: summary.subtotal, discount: summary.discount, ht: summary.ht, tax: summary.tax, ttc: summary.ttc } },
      { filename: "estimate-large-amounts.pdf", pages: (await PDFDocument.load(largeBytes)).getPageCount(), rows: 2, marker: "ROW-LARGE-", required: ["CLIENT-LARGE-QA", "RESERVES-LARGE-QA", "Duree previsionnelle", "Complexite estimee", "1 a 8 jours", "2 a 5 semaines", "6 a 16 semaines"], totals: largeTotals, discountedMid: largeDiscount, duration: eightLots.duration }
    ];
    for (const fixture of fixtures) assert.ok(fixture.rows <= 2 || fixture.pages > 3, "Pagination multipage attendue");
    await writeFile(join(output, "pdf-fixtures.json"), JSON.stringify({ generatedAt: "2026-10-06", fixtures }, null, 2));
    console.log("PASS generation :", fixtures.map((fixture) => `${fixture.filename} (${fixture.pages} pages)`).join(", "));
    console.log("Verification extraction + rendu : python scripts/verify-pdf-render.py --poppler-bin <runtime/poppler/Library/bin>");
  } finally { prisma.siteSettings.findUnique = previousSettings; }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
