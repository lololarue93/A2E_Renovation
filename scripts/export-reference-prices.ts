import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { priceItems } from "../src/lib/pricing/price-data";
import { exportCatalogCsv, parseCatalogCsv, validatePriceItem } from "../src/lib/pricing/catalog-transfer";

/** Export indicative demonstration defaults, never live supplier quotes or production prices. */
async function main() {
  const expected = priceItems.map(validatePriceItem);
  assert.ok(expected.length > 0, "Le referentiel ne doit pas etre vide.");
  assert.equal(new Set(expected.map((item) => item.key)).size, expected.length, "Les references doivent etre uniques.");
  const csv = exportCatalogCsv(priceItems);
  assert.deepEqual(parseCatalogCsv(csv), expected, "L'export doit conserver prix, unites, libelles, descriptions et references.");
  const output = resolve(process.cwd(), "docs", "prix-references-2026.csv");
  await writeFile(output, csv, "utf8");
  assert.deepEqual(parseCatalogCsv(await readFile(output, "utf8")), expected, "La relecture du fichier doit confirmer l'aller-retour CSV.");
  console.log(`PASS : ${expected.length} references exportees dans docs/prix-references-2026.csv et relues sans perte.`);
  console.log("Prix indicatifs de demonstration ; aucun tarif fournisseur negocie ou valide. Les hypotheses et taux de TVA restent a confirmer.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
