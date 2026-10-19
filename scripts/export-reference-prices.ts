import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { detailedPriceKeys, priceItems } from "../src/lib/pricing/price-data";
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
  const detailedKeys=new Set(detailedPriceKeys);
  const detailed=priceItems.filter(item=>detailedKeys.has(item.key));
  assert.equal(detailed.length,detailedKeys.size,"Toutes les nouvelles cles detaillees sont presentes.");
  const detailedExpected=detailed.map(validatePriceItem);
  const detailedOutput=resolve(process.cwd(),"docs","prix-detail-a-la-carte-2026.csv");
  await writeFile(detailedOutput,exportCatalogCsv(detailed),"utf8");
  assert.deepEqual(parseCatalogCsv(await readFile(detailedOutput,"utf8")),detailedExpected,"L'import additif ne contient que les nouvelles references.");
  console.log(`PASS : ${expected.length} references exportees dans docs/prix-references-2026.csv et relues sans perte.`);
  console.log(`PASS : ${detailed.length} nouvelles references dans docs/prix-detail-a-la-carte-2026.csv, sans tarifs historiques.`);
  console.log("Prix indicatifs de demonstration ; aucun tarif fournisseur negocie ou valide. Les hypotheses et taux de TVA restent a confirmer.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
