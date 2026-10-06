import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import { priceItems } from "../src/lib/pricing/price-data";
import { exportCatalogCsv, parseCatalogCsv, validatePriceItem } from "../src/lib/pricing/catalog-transfer";
import { calculateQuote, exportQuoteCsv, lineFromCatalog, newQuote, validateQuote } from "../src/lib/pricing/quote-workspace";
import { generateWorkspaceQuote } from "../src/lib/pdf/generate-workspace-quote";
import { requireAdmin } from "../src/lib/auth/require-admin";
import { NextRequest } from "next/server";
import { GET as getCatalog, PUT as putCatalog, POST as postCatalog } from "../src/app/api/admin/pricing/route";
import { POST as importCatalog } from "../src/app/api/admin/pricing/import/route";
import { GET as getQuotes, PUT as putQuote } from "../src/app/api/admin/cotations/route";
import { POST as exportPdf } from "../src/app/api/admin/cotations/export/route";

async function main() {
  const window = lineFromCatalog(priceItems.find((item) => item.key === "window_pvc"));
  window.quantity = 2;
  Object.assign(window, { low: 400, mid: 550, high: 750 }); // Deterministic arithmetic fixture, independent of market updates.
  window.vatRate = 5.5;
  const insulation = lineFromCatalog(priceItems.find((item) => item.key === "ite_pse"));
  Object.assign(insulation, { low: 110, mid: 150, high: 210, quantity: 2, width: 4, height: 2.5, useDimensions: true, vatRate: 10 });
  const quote = { ...newQuote(), client: "Client de verification", basis: "ht" as const, lines: [window, insulation] };
  const totals = calculateQuote(validateQuote(quote));
  assert.equal(totals.lines[1].effectiveQuantity, 20, "Metre 4 x 2,5 x 2 = 20 m2");
  assert.deepEqual(totals.totals, { low: 3000, mid: 4100, high: 5700 }, "Total exact des postes sans forfait ou coefficient cache");
  assert.deepEqual(totals.tax, { low: 264, mid: 360.5, high: 502.5 }, "TVA propre a chaque ligne");
  assert.equal(totals.ttc.mid, 4460.5);
  const discountedQuote = { ...quote, discountPercent: 10, discountReason: "Regroupement des lots" };
  const discounted = calculateQuote(validateQuote(discountedQuote));
  assert.equal(discounted.subtotal.mid, 4100, "Le prix de reference n'est pas releve");
  assert.equal(discounted.discount.mid, 410);
  assert.equal(discounted.totals.mid, 3690);
  assert.equal(discounted.tax.mid, 324.45, "TVA recalculee sur chaque ligne nette remise");
  assert.equal(discounted.ttc.mid, 4014.45);
  const ttcQuote = { ...quote, basis: "ttc" as const, lines: [{ ...window, quantity: 1, low: 105.5, mid: 105.5, high: 105.5 }] };
  const reverse = calculateQuote(ttcQuote);
  assert.equal(reverse.ht.mid, 100);
  assert.equal(reverse.tax.mid, 5.5);
  const discountedTtc = calculateQuote({ ...ttcQuote, discountPercent: 10, discountReason: "Geste commercial" });
  assert.equal(discountedTtc.totals.mid, 94.95);
  assert.equal(discountedTtc.ht.mid, 90);
  assert.equal(discountedTtc.tax.mid, 4.95);
  assert.equal(calculateQuote({ ...quote, basis: "unspecified" }).tax.mid, 0, "Aucune taxe devinee si la base fiscale est inconnue");
  assert.equal(calculateQuote({ ...quote, lines: [window] }).totals.mid, 1100, "Supprimer un poste recalcule le total");
  assert.equal(calculateQuote({ ...quote, lines: [window, { ...window, id: crypto.randomUUID() }] }).totals.mid, 2200, "Dupliquer un poste conserve ses prix et sa quantite");
  const cents = calculateQuote({ ...quote, lines: [{ ...window, quantity: 3, low: 0.1, mid: 0.1, high: 0.1, vatRate: 20 }] });
  assert.equal(cents.totals.mid, 0.3);
  assert.equal(cents.tax.mid, 0.06);
  for (const invalid of [
    { ...quote, lines: [{ ...window, quantity: 0 }] },
    { ...quote, lines: [{ ...window, low: 1000, mid: 1 }] },
    { ...quote, lines: [{ ...window, high: NaN }] },
    { ...quote, lines: [{ ...window, useDimensions: true }] },
    { ...quote, lines: [window, window] },
    { ...quote, date: "2026-02-31" },
    { ...quote, email: "invalide" },
    { ...quote, discountPercent: -1 },
    { ...quote, discountPercent: 15.1, discountReason: "Geste commercial" },
    { ...quote, discountPercent: 5, discountReason: "" },
    { ...quote, lines: [{ ...insulation, quantity: 1_000_000 }] }
  ]) assert.throws(() => validateQuote(invalid));

  const item = validatePriceItem({ ...priceItems[0], low: 400, mid: 550, high: 750, reference: '=HYPERLINK("https://example.com")', description: 'Fourniture; pose "standard"\nDeuxieme ligne', vatRate: 5.5 });
  const csv = exportCatalogCsv([item]);
  assert.match(csv, /'=HYPERLINK/, "Les formules ne sont pas executees dans Excel");
  assert.deepEqual(parseCatalogCsv(csv), [item], "UTF-8 BOM, guillemets, point-virgule et retour ligne restent reversibles");
  const apostropheItem = { ...item, reference: "'=REFERENCE_LITTERALE" };
  assert.deepEqual(parseCatalogCsv(exportCatalogCsv([apostropheItem])), [apostropheItem], "Une apostrophe litterale devant une formule n'est pas perdue");
  assert.equal(parseCatalogCsv(csv.replace("400", "400,4"))[0].low, 400.4, "Decimales francaises conservees au centime");
  const centsItem = validatePriceItem({ ...item, low: 17.5, mid: 19.95, high: 22.1 });
  assert.deepEqual(parseCatalogCsv(exportCatalogCsv([centsItem])), [centsItem], "17,50 EUR reste 17,50 apres export et relecture CSV");
  const centsLine = lineFromCatalog(centsItem);
  const centsTotal = calculateQuote({ ...quote, lines: [{ ...centsLine, quantity: 3 }] });
  assert.equal(centsTotal.totals.low, 52.5, "Trois unites a 17,50 coutent exactement 52,50, pas 54");
  assert.equal(centsTotal.totals.mid, 59.85);
  assert.equal(validatePriceItem({ ...item, low: 17.505 }).low, 17.51);
  assert.throws(() => parseCatalogCsv(exportCatalogCsv([item, item])), /dupliquee/);
  assert.throws(() => parseCatalogCsv(csv.replace('"550"', '"1"')), /bas <= central/);
  assert.throws(() => parseCatalogCsv('key;label\nfoo;bar'), /Colonnes attendues/);
  assert.throws(() => parseCatalogCsv(csv + '\n"non ferme'), /non ferme/);
  for (const invalid of [{ ...item, category: "toString" }, { ...item, unit: "millimetre" }, { ...item, low: "" }, { ...item, mid: -1 }, { ...item, high: Infinity }, { ...item, vatRate: 7 }, { ...item, key: "../x" }]) assert.throws(() => validatePriceItem(invalid));
  assert.match(exportQuoteCsv(quote), /TOTAL HT/);
  assert.match(exportQuoteCsv(discountedQuote), /REMISE COMMERCIALE/);
  assert.match(exportQuoteCsv(discountedQuote), /TOTAL APRES REMISE/);
  assert.match(exportQuoteCsv({ ...quote, basis: "unspecified" }), /TVA non calculee/);

  const originalEmail = process.env.ADMIN_EMAIL, originalPassword = process.env.ADMIN_PASSWORD;
  try {
    delete process.env.ADMIN_EMAIL; delete process.env.ADMIN_PASSWORD;
    assert.equal(requireAdmin(new Request("http://localhost/api/admin/pricing"))?.status, 503);
    process.env.ADMIN_EMAIL = "admin@example.com"; process.env.ADMIN_PASSWORD = "verification-secret";
    assert.equal(requireAdmin(new Request("http://localhost/api/admin/pricing"))?.status, 401);
    assert.equal(requireAdmin(new Request("http://localhost/api/admin/pricing", { headers: { authorization: "Basic malformed==" } }))?.status, 401);
    const authenticated = new Request("http://localhost/api/admin/pricing", { headers: { authorization: `Basic ${Buffer.from("admin@example.com:verification-secret").toString("base64")}` } });
    assert.equal(requireAdmin(authenticated), null);
    for (const route of [getCatalog, putCatalog, postCatalog, importCatalog, getQuotes, putQuote, exportPdf]) {
      const response = await route(new NextRequest("http://localhost/api/admin/pricing"));
      assert.equal(response.status, 401, "Chaque route admin refuse l'acces meme sans middleware");
    }
    const originalDatabase = process.env.DATABASE_URL;
    try {
      delete process.env.DATABASE_URL;
      const headers = { authorization: authenticated.headers.get("authorization")!, "content-type": "application/json" };
      const unavailable = await putQuote(new NextRequest("http://localhost/api/admin/cotations", { method: "PUT", headers, body: JSON.stringify(quote) }));
      assert.equal(unavailable.status, 503, "Une base absente ne produit jamais une fausse confirmation de sauvegarde");
      const invalidPdf = await exportPdf(new NextRequest("http://localhost/api/admin/cotations/export", { method: "POST", headers, body: JSON.stringify({ ...quote, lines: [{ ...window, quantity: 0 }] }) }));
      assert.equal(invalidPdf.status, 400, "Le PDF revalide les quantites cote serveur");
      const validPdf = await exportPdf(new NextRequest("http://localhost/api/admin/cotations/export", { method: "POST", headers, body: JSON.stringify({ ...discountedQuote, totals: { mid: 1 } }) }));
      assert.equal(validPdf.status, 200, "Le PDF ignore tout total du navigateur et recalcule les lignes");
      assert.equal(validPdf.headers.get("content-type"), "application/pdf");
      assert.ok((await PDFDocument.load(await validPdf.arrayBuffer())).getPageCount() >= 1);
    } finally { if (originalDatabase === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = originalDatabase; }
    process.env.ADMIN_PASSWORD = "change-me";
    assert.equal(requireAdmin(authenticated)?.status, 503);
  } finally {
    if (originalEmail === undefined) delete process.env.ADMIN_EMAIL; else process.env.ADMIN_EMAIL = originalEmail;
    if (originalPassword === undefined) delete process.env.ADMIN_PASSWORD; else process.env.ADMIN_PASSWORD = originalPassword;
  }

  const pdf = await PDFDocument.load(await generateWorkspaceQuote(quote, "01 00 00 00 00"));
  assert.ok(pdf.getPageCount() >= 1);
  const longQuote = { ...quote, notes: "Reserves de verification ".repeat(70), lines: Array.from({ length: 50 }, (_, index) => ({ ...insulation, id: crypto.randomUUID(), label: `Poste ${index + 1} - finition etanche`, description: "Fourniture, pose, depose, supports et raccordements. ".repeat(8) })) };
  const longPdf = await PDFDocument.load(await generateWorkspaceQuote(validateQuote(longQuote), "01 00 00 00 00"));
  assert.ok(longPdf.getPageCount() > 3, "Un gros document reste genere avec pagination");
  console.log("PASS : cotations multi-postes, metre, TVA HT/TTC, arrondis, validation, CSV reversible, protection admin et PDF multipage.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
