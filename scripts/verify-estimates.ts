import assert from "node:assert/strict";
import { estimateProject, type EstimateInput } from "../src/lib/pricing/estimate-engine";
import { priceItems, pricingCoefficients, type PriceItem } from "../src/lib/pricing/price-data";
import { estimateInputSchema } from "../src/lib/validators/estimate.schema";
import { aidSnapshot, incomeProfile2026 } from "../src/lib/pricing/aid-data";
import { calculateIndicativeVat } from "../src/lib/pricing/finance-calculator";
import { changeWindowKind, windowMaterialsForKind } from "../src/lib/pricing/window-config";

const base: EstimateInput = { projectType: "windows", projectTypes: ["windows"], city: "Saint-Denis", postalCode: "93200", finish: "standard", urgency: "normal", access: "simple", windowItems: [{ kind: "window", quantity: 2, material: "pvc", width: 100, height: 170, opening: "french", installPack: "renovation", shutter: false }] };
const find = (key: string, catalog: PriceItem[] = priceItems) => { const item = catalog.find((line) => line.key === key); assert.ok(item, `Tarif attendu : ${key}`); return item; };
const sum = (result: ReturnType<typeof estimateProject>, scenario: "low" | "mid" | "high") => result.lines.reduce((total, line) => total + line[scenario], 0);

function main() {
  const referenceBefore = JSON.stringify(priceItems);
  const inputBefore = JSON.stringify(base);
  const reference = estimateProject(estimateInputSchema.parse(base), priceItems);
  const coefficient = 1;
  assert.equal(reference.mid, Math.round(find("window_pvc").mid * 2 * coefficient) + Math.round(find("pose_renovation").mid * 2 * coefficient));
  const adjusted = priceItems.map((item) => item.key === "window_pvc" ? { ...item, low: item.low + 100, mid: item.mid + 100, high: item.high + 100, description: "Tarif entreprise mis a jour" } : { ...item });
  const adjustedBefore = JSON.stringify(adjusted);
  const modified = estimateProject(base, adjusted);
  assert.ok(modified.mid > reference.mid, "Une modification catalogue est prise en compte sans nouveau build");
  assert.match(modified.lines[0].description ?? "", /Tarif entreprise mis a jour/);
  assert.deepEqual(estimateProject(base, priceItems), reference, "Les requetes ne contaminent pas la matrice centrale");
  assert.equal(JSON.stringify(priceItems), referenceBefore);
  assert.equal(JSON.stringify(adjusted), adjustedBefore);
  assert.equal(JSON.stringify(base), inputBefore);
  assert.throws(() => estimateProject(base, []), /Tarif indisponible/, "Un tarif requis absent est explicite");

  const multi: EstimateInput = { ...base, projectTypes: ["windows", "insulation", "electricity", "plumbing", "kitchen_bath", "roofing", "global"], surfaces: { insulation: 13, electricity: 27, kitchen_bath: 6, roofing: 41, global: 53 }, surface: 90, includePanel: true, electricalItems: [{ kind: "socket", quantity: 4 }, { kind: "cooktop", quantity: 1 }], plumbingFixtures: [{ kind: "basin", quantity: 2 }], roomType: "kitchen", globalLevel: "medium", access: "difficult", urgency: "fast", postalCode: "75010" };
  const result = estimateProject(estimateInputSchema.parse(multi), adjusted);
  const byPrefix = (prefix: string) => { const line = result.lines.find((item) => item.label.startsWith(find(prefix).label)); assert.ok(line, prefix); return line; };
  assert.equal(byPrefix("ite_pse").quantity, 13);
  assert.equal(byPrefix("ite_pse").mid, Math.round(find("ite_pse", adjusted).mid * 13 * pricingCoefficients.access.difficult * pricingCoefficients.urgency.fast), "Les coefficients documentes sont appliques une seule fois");
  assert.equal(byPrefix("electric_full").quantity, 27);
  assert.equal(byPrefix("kitchen").quantity, 6);
  assert.equal(byPrefix("roof_repair").quantity, 41);
  assert.equal(result.lines.some((line) => line.label.startsWith(find("global_medium").label)), false, "Le forfait global ne double pas les lots deja detailles");
  assert.ok(result.lines.some((line) => line.label.startsWith(find("coordination").label)));
  assert.match(result.assumptions.join(" "), /Global combine.*autres travaux ne sont pas inclus/);
  const globalAlone = estimateProject({ ...multi, projectType: "global", projectTypes: ["global"] }, adjusted);
  assert.equal(globalAlone.lines[0].quantity, 53, "Le global seul garde la surface declaree exacte");
  assert.equal(byPrefix("plumbing_basin").quantity, 2);
  assert.equal(byPrefix("electric_point").quantity, 4);
  for (const scenario of ["low", "mid", "high"] as const) assert.equal(result[scenario], sum(result, scenario), `Le total ${scenario} est exactement la somme des lignes apres coefficients`);
  for (const line of result.lines) assert.ok(line.low <= line.mid && line.mid <= line.high && line.low >= 0);
  const isolated = estimateProject({ ...multi, projectType: "insulation", projectTypes: ["insulation"] }, adjusted);
  assert.equal(isolated.lines[0].mid, byPrefix("ite_pse").mid, "Les surfaces des autres lots ne changent pas l'ITE");
  const repeated = estimateProject({ ...base, projectTypes: ["windows", "windows"] });
  assert.deepEqual(repeated, reference, "Une categorie repetee ne double pas la facture");
  const tiny = estimateProject({ ...base, projectType: "insulation", projectTypes: ["insulation"], surfaces: { insulation: 2 }, insulationFinish: "unknown" });
  assert.equal(tiny.lines[0].quantity, 2, "Une petite surface ITE/isolation n'est pas gonflee a 20 m2");
  assert.equal(tiny.mid, Math.round(find("inside_wall").mid * 2 * coefficient));
  const facade: EstimateInput = { ...base, projectType: "insulation", projectTypes: ["insulation"], surfaces: { insulation: 0.5 }, insulationThickness: 120 };
  const baseFacade = estimateProject(facade);
  assert.equal(baseFacade.lines[0].quantity, 0.5);
  assert.equal(baseFacade.lines.length, 1, "Pas d'echafaudage facture par defaut");
  assert.equal(estimateProject({ ...facade, insulationThickness: 200 }).mid, baseFacade.mid, "Pas de supplement invente au-dela de 140 mm");
  const scaffolding = estimateProject({ ...facade, includeScaffold: true });
  assert.equal(scaffolding.lines.length, 2);
  assert.equal(scaffolding.mid - baseFacade.mid, Math.round(find("scaffold_simple").mid * 0.5));
  const materialCatalog = [...priceItems.filter((item) => !["ite_graphite", "ite_wood"].includes(item.key)),
    { ...find("ite_pse"), key: "ite_graphite", label: "ITE graphite de verification", low: 111, mid: 166, high: 222 },
    { ...find("ite_pse"), key: "ite_wood", label: "ITE fibre bois de verification", low: 122, mid: 177, high: 233 }];
  for (const material of ["pse", "graphite", "rockwool", "wood"] as const) {
    const materialInput = estimateInputSchema.parse({ ...facade, insulationMaterial: material });
    assert.equal(estimateProject(materialInput, materialCatalog).mid, Math.round(find(`ite_${material}`, materialCatalog).mid * 0.5), "L'isolant selectionne utilise sa ligne propre");
  }
  const noVatCatalog = priceItems.map((item) => ({ ...item, vatRate: undefined, description: undefined }));
  const neutral = estimateProject({ ...base, windowItems: [{ ...base.windowItems![0], material: "alu" }] }, noVatCatalog);
  assert.equal(neutral.lines[0].vatRate, undefined, "La TVA absente n'est pas inventee");
  assert.equal(neutral.tvaRate, null);
  assert.doesNotMatch(neutral.lines[0].description ?? "", /PVC/);
  assert.match(neutral.lines[0].description ?? "", /coefficient 1.000/);
  for (const projectType of ["roofing", "kitchen_bath"] as const) {
    const small = estimateProject({ ...base, projectType, projectTypes: [projectType], surfaces: { [projectType]: 0.5 } });
    assert.equal(small.lines[0].quantity, 0.5, `Le metre de ${projectType} n'est pas releve a un minimum cache`);
  }
  const withCustom = estimateProject({ ...base, customItems: [{ key: "acoustic", quantity: 3 }] }, adjusted);
  assert.equal(withCustom.lines.at(-1)?.quantity, 3);
  assert.equal(withCustom.mid - modified.mid, Math.round(find("acoustic").mid * 3 * coefficient));
  assert.throws(() => estimateProject({ ...base, customItems: [{ key: "inconnu", quantity: 1 }] }), /Tarif indisponible : inconnu/);
  assert.throws(() => estimateProject({ ...base, customItems: [{ key: "acoustic", quantity: 0 }] }), /Quantite invalide/);
  const wood = estimateProject({ ...base, windowItems: [{ ...base.windowItems![0], material: "wood" }] });
  assert.equal(wood.lines[0].mid, Math.round(find("window_wood").mid * 2 * coefficient), "Le bois lit sa ligne catalogue propre");
  const legacyWood = estimateProject({ ...base, windowItems: undefined, material: "wood", quantity: 2, windowWidth: 100, windowHeight: 170 });
  assert.equal(legacyWood.lines[0].mid, wood.lines[0].mid);
  const woodItem = { ...base.windowItems![0], material: "wood" as const };
  assert.equal(changeWindowKind(woodItem, "window").material, "wood", "Une fenetre conserve son materiau bois");
  for (const kind of ["door_window", "bay", "entry_door"] as const) {
    const next = changeWindowKind(woodItem, kind);
    assert.equal(next.material, "pvc", "Le changement de type remet le materiau sur une option visible compatible");
    assert.ok(windowMaterialsForKind(kind).includes(next.material));
    assert.equal(changeWindowKind({ ...woodItem, material: "alu" }, kind).material, "alu", "L'aluminium compatible est conserve");
    assert.doesNotThrow(() => estimateProject({ ...base, windowItems: [next] }), "La configuration normalisee doit rester chiffrable");
    assert.equal(woodItem.material, "wood", "Le changement ne modifie pas l'objet du precedent type");
  }
  assert.equal(estimateInputSchema.safeParse({ ...base, windowItems: [{ ...base.windowItems![0], material: "wood" }] }).success, true);
  const aluDoor = { ...base, windowItems: [{ ...base.windowItems![0], kind: "door_window" as const, material: "alu" as const }] };
  const catalogueWithoutAluDoor = priceItems.filter((item) => item.key !== "door_window_alu");
  assert.throws(() => estimateProject(aluDoor, catalogueWithoutAluDoor), /Tarif indisponible : door_window_alu/);
  const catalogueWithAluDoor = [...catalogueWithoutAluDoor, { ...find("door_window_pvc"), key: "door_window_alu", label: "Porte-fenetre aluminium de verification", low: 700, mid: 1200, high: 1500 }];
  const pricedAluDoor = estimateProject(aluDoor, catalogueWithAluDoor);
  assert.equal(pricedAluDoor.lines[0].mid, Math.round(1200 * 2 * coefficient), "Une porte-fenetre alu ne reprend pas le prix PVC");
  assert.throws(() => estimateProject({ ...base, windowItems: [{ ...base.windowItems![0], kind: "entry_door", material: "wood" }] }), /entry_door_wood/);
  assert.throws(() => estimateProject({ ...base, windowItems: undefined, material: "mixed" }), /materiau de chaque ouvrant/);
  const basicWindow = estimateProject({ ...base, windowItems: [{ ...base.windowItems![0], quantity: 1 }] });
  assert.equal(basicWindow.lines[0].quantity, 1);
  const options = estimateProject({ ...base, windowItems: [{ ...base.windowItems![0], opening: "oscillo", shutter: true, installPack: "total" }], acoustic: true });
  assert.ok(options.lines.some((line) => line.label.startsWith(find("pose_total").label)));
  assert.ok(options.lines.some((line) => line.label.startsWith(find("oscillo_battant").label)));
  assert.ok(options.lines.some((line) => line.label.startsWith(find("shutter_motor").label)));
  assert.ok(options.lines.some((line) => line.label.startsWith(find("acoustic").label)));

  for (const invalid of [
    { ...base, projectType: "inconnu" }, { ...base, projectTypes: [] }, { ...base, surface: -1 }, { ...base, surface: NaN },
    { ...base, surfaces: { insulation: 0 } }, { ...base, surfaces: { garage: 12 } }, { ...base, windowItems: [{ ...base.windowItems![0], quantity: 0 }] },
    { ...base, windowItems: [{ ...base.windowItems![0], width: 0 }] }, { ...base, windowItems: [{ ...base.windowItems![0], height: Infinity }] },
    { ...base, electricalItems: [{ kind: "socket", quantity: -1 }] }, { ...base, plumbingFixtures: [{ kind: "wc", quantity: 0 }] },
    { ...base, customItems: [{ key: "acoustic", quantity: -2 }] }, { ...base, postalCode: "750" }
  ]) assert.equal(estimateInputSchema.safeParse(invalid).success, false, "Les entrees hors domaine ne sont pas calculees pour un lead");
  const noBill = estimateProject({ ...base, projectType: "global", projectTypes: ["global"], energy: { annualConsumption: 15000 } });
  assert.equal(noBill.roi, undefined, "Aucun prix energie n'est invente si la facture n'est pas declaree");
  const energy = estimateProject({ ...base, projectType: "global", projectTypes: ["global"], energy: { annualEnergyCost: 2400, annualConsumption: 15000, insulation: "none", currentDpe: "F_G" } });
  assert.equal(energy.roi?.annualSavings, 1056);
  assert.equal(energy.roi?.currentAnnualCost, 2400);
  for (const hvacType of ["pac_air_water", "pac_air_air", "pac_air_water_large"] as const) {
    const heating = estimateProject(estimateInputSchema.parse({ ...base, projectType: "hvac", projectTypes: ["hvac"], hvacType, surfaces: { hvac: 5 } }));
    assert.equal(heating.lines[0].mid, find(hvacType).mid, "La technologie PAC est un choix explicite");
  }
  const legacyPac = estimateProject({ ...base, projectType: "hvac", projectTypes: ["hvac"], hvacType: "pac", surface: 5, energy: { annualConsumption: 1000 } });
  assert.equal(legacyPac.lines[0].mid, find("pac_air_water").mid, "Une petite surface ne transforme pas silencieusement une PAC en air/air");
  const paris = estimateProject({ ...base, city: "Paris", postalCode: "75010" });
  assert.equal(paris.mid, reference.mid, "Pas de second coefficient arbitraire applique au catalogue IDF");
  assert.deepEqual(calculateIndicativeVat(120, 20), { excludingTax: 100, tax: 20, includingTax: 120 });
  assert.deepEqual(calculateIndicativeVat(105.5, 5.5), { excludingTax: 100, tax: 5.5, includingTax: 105.5 });
  assert.deepEqual(calculateIndicativeVat(100.01, 0), { excludingTax: 100.01, tax: 0, includingTax: 100.01 });
  for (const [amount, rate] of [[-1, 20], [NaN, 10], [120, -1], [120, Infinity]]) assert.throws(() => calculateIndicativeVat(amount, rate));

  for (let people = 1; people <= 5; people++) {
    const limits = aidSnapshot.incomeLimits2026[people - 1];
    for (let threshold = 0; threshold < 3; threshold++) {
      assert.equal(incomeProfile2026(people, limits[threshold]).index, threshold, "Le plafond exact reste dans le profil");
      assert.equal(incomeProfile2026(people, limits[threshold] + 1).index, threshold + 1, "Un euro au-dessus change le profil");
    }
  }
  const sixthPerson = aidSnapshot.incomeLimits2026[4].map((limit, index) => limit + aidSnapshot.additionalPerson[index]);
  assert.deepEqual(incomeProfile2026(6, 0).limits, sixthPerson, "Personne supplementaire au-dela de cinq");
  assert.equal(incomeProfile2026(6, sixthPerson[0]).index, 0);
  assert.equal(incomeProfile2026(6, sixthPerson[0] + 1).index, 1);
  for (const [people, income] of [[0, 0], [1.5, 20000], [21, 0], [1, -1], [1, NaN]]) assert.throws(() => incomeProfile2026(people, income));
  console.log("PASS : catalogue dynamique, isolation des requetes, multi-lots/surfaces, coefficients/totaux, petites surfaces, validation et plafonds aides IDF 2026.");
}
main();
