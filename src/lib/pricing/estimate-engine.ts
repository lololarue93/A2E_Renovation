import { priceItems, pricingCoefficients, type ProjectType, type PriceItem } from "./price-data";

export type WindowItem = {
  kind: "window" | "door_window" | "entry_door" | "bay";
  quantity: number;
  material: "pvc" | "alu" | "wood";
  width: number;
  height: number;
  opening: "fixed" | "french" | "oscillo" | "sliding";
  installPack: "renovation" | "total";
  shutter: boolean;
};

export type ElectricalItem = { kind: "socket" | "socket_replace" | "lighting" | "luminaire" | "cooktop" | "ev" | "network"; quantity: number };
export type PlumbingFixture = { kind: "shower" | "bath" | "basin" | "wc" | "sink" | "water_point" | "removal"; quantity: number };
export const electricalPacks: Record<"room" | "apartment", { label: string; items: ElectricalItem[] }> = {
  room: { label: "Pack pièce : 4 prises, 1 point lumineux, 1 circuit dédié", items: [{ kind: "socket", quantity: 4 }, { kind: "lighting", quantity: 1 }, { kind: "cooktop", quantity: 1 }] },
  apartment: { label: "Pack logement : 12 prises, 5 points lumineux, 3 circuits dédiés", items: [{ kind: "socket", quantity: 12 }, { kind: "lighting", quantity: 5 }, { kind: "cooktop", quantity: 3 }] }
};
export const bathroomPackFixtures: PlumbingFixture[] = [{ kind: "shower", quantity: 1 }, { kind: "basin", quantity: 1 }, { kind: "wc", quantity: 1 }];
export type EnergyInput = {
  annualConsumption?: number;
  annualEnergyCost?: number;
  energyType?: "electricity" | "gas" | "fuel" | "other";
  household?: number;
  homeYear?: "before_1975" | "1975_2000" | "2000_2012" | "after_2012";
  currentDpe?: "A_B" | "C_D" | "E" | "F_G" | "unknown";
  insulation?: "good" | "partial" | "none" | "unknown";
  solar?: boolean;
  solarKw?: number;
  selfConsumption?: boolean;
};

export type EstimateInput = {
  projectType: ProjectType;
  projectTypes?: ProjectType[];
  city?: string;
  postalCode?: string;
  surface?: number;
  surfaces?: Partial<Record<ProjectType, number>>;
  roomType?: "kitchen" | "bathroom";
  quantity?: number;
  material?: "pvc" | "alu" | "wood" | "mixed";
  windowWidth?: number;
  windowHeight?: number;
  opening?: "fixed" | "french" | "oscillo" | "sliding";
  installPack?: "renovation" | "total";
  windowItems?: WindowItem[];
  insulationFinish?: "render" | "cladding" | "unknown";
  insulationMaterial?: "pse" | "graphite" | "rockwool" | "wood";
  includeScaffold?: boolean;
  insulationThickness?: number;
  globalLevel?: "light" | "medium" | "full";
  electricalScope?: "partial" | "full";
  electricalMode?: "items" | "pack" | "legacy";
  electricalPack?: "room" | "apartment";
  electricalPanel?: "none" | "1r4c" | "2r8c" | "3r12c";
  electricalPoints?: number;
  electricalItems?: ElectricalItem[];
  plumbingPoints?: number;
  plumbingFixtures?: PlumbingFixture[];
  plumbingMode?: "items" | "bathroom_pack" | "legacy";
  includePlumbingDistribution?: boolean;
  bathroomMode?: "finishes" | "standard_pack" | "legacy";
  bathroomFloorArea?: number;
  bathroomWallArea?: number;
  includePanel?: boolean;
  includeWaterHeaterConnection?: boolean;
  hvacType?: "pac" | "pac_air_water" | "pac_air_air" | "pac_air_water_large" | "vmc_simple" | "vmc_hygro" | "vmc_double" | "water_heater";
  energy?: EnergyInput;
  finish: "economy" | "standard" | "premium";
  urgency: "info" | "normal" | "fast" | "urgent";
  access?: "simple" | "medium" | "difficult";
  shutters?: boolean;
  acoustic?: boolean;
  customItems?: Array<{ key: string; quantity: number }>;
};

export type EstimateLine = { label: string; quantity: number; unit: string; low: number; mid: number; high: number; reference?: string; description?: string; vatRate?: number };
export type EstimateOffer = { name: string; price: number; summary: string; included: string[] };
export type EstimateResult = {
  low: number;
  mid: number;
  high: number;
  duration: string;
  complexity: "simple" | "standard" | "complexe";
  maturityScore: number;
  lines: EstimateLine[];
  assumptions: string[];
  tvaRate: number | null;
  offers: EstimateOffer[];
  roadmap: string[];
  roi?: { annualSavings: number; paybackYears: number; currentAnnualCost: number; energyGainPercent: number };
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const findItem = (catalog: PriceItem[], key: string) => { const item = catalog.find(item => item.key === key); if (!item) throw new Error("Tarif indisponible : " + key); return item; };

// The catalogue is calibrated for Ile-de-France: do not mark it up a second time.
function regionCoefficient() { return 1; }

function makeLine(catalog: PriceItem[], key: string, quantity = 1, label?: string, multiplier = 1): EstimateLine {
  if (!Number.isFinite(quantity) || quantity <= 0) throw new Error("Quantite invalide pour le tarif : " + key);
  const item = findItem(catalog, key);
  const displayLabel = label ?? item.label;
  const scopeDescription = "Perimetre et references a confirmer avec A2E. Le prix unitaire du catalogue est applique a la quantite declaree. Pose et options uniquement selon les lignes retenues.";
  return { label: item.reference ? `${displayLabel} - ${item.reference}` : displayLabel, quantity, unit: item.unit, low: item.low * quantity * multiplier, mid: item.mid * quantity * multiplier, high: item.high * quantity * multiplier, reference: item.reference ?? "Materiel ou equivalent a valider lors de la visite technique", description: item.description ?? scopeDescription, vatRate: item.vatRate };
}

function windowLines(input: EstimateInput, catalog: PriceItem[]) {
  const lineFromItem = (...args: [string, number?, string?, number?]) => makeLine(catalog, ...args);
  if (!input.windowItems?.length && input.material === "mixed") throw new Error("Precisez le materiau de chaque ouvrant pour un projet mixte.");
  const items = input.windowItems?.length ? input.windowItems : [{ kind: "window", quantity: input.quantity ?? 1, material: input.material ?? "pvc", width: input.windowWidth ?? 125, height: input.windowHeight ?? 135, opening: input.opening ?? "french", installPack: input.installPack ?? "renovation", shutter: Boolean(input.shutters) }];
  const lines: EstimateLine[] = [];
  for (const item of items) {
    if (![item.width, item.height].every((dimension) => Number.isFinite(dimension) && dimension > 0)) throw new Error("Dimensions invalides pour l'ouvrant.");
    const area = (item.width * item.height) / 10000;
    const key = item.kind === "entry_door" ? `entry_door_${item.material}` : item.kind === "bay" ? (item.material === "alu" ? "sliding_alu" : `bay_${item.material}`) : item.kind === "door_window" ? `door_window_${item.material}` : `window_${item.material}`;
    const baseArea = item.kind === "entry_door" ? 1.9 : item.kind === "bay" ? 3.8 : 1.7;
    const dimensionFactor = clamp(0.78 + area / baseArea * 0.22, 0.78, 2.2);
    const opening = lineFromItem(key, item.quantity, `${item.kind === "entry_door" ? "Porte d'entree" : item.kind === "bay" ? "Baie vitree" : item.kind === "door_window" ? "Porte-fenetre" : "Fenetre"} ${item.material.toUpperCase()} - ${item.width} x ${item.height} cm`, dimensionFactor);
    opening.description += ` Hypothese dimensionnelle : coefficient ${dimensionFactor.toFixed(3)}, surface ${area.toFixed(2)} m2, reference ${baseArea} m2, bornes 0.78 a 2.20. A confirmer sur devis fournisseur.`;
    lines.push(opening);
    lines.push(lineFromItem(item.installPack === "total" ? "pose_total" : "pose_renovation", item.quantity));
    if (item.opening === "oscillo") lines.push(lineFromItem("oscillo_battant", item.quantity));
    if (item.shutter) lines.push(lineFromItem("shutter_motor", item.quantity));
    if (area > 2.5) lines.push(lineFromItem("oversize_joinery", item.quantity, "Grande dimension / manutention"));
  }
  if (input.acoustic) lines.push(lineFromItem("acoustic", items.reduce((sum, item) => sum + item.quantity, 0)));
  return lines;
}

const electricalKeys: Record<ElectricalItem["kind"], string> = { socket: "electric_socket_new", socket_replace: "electric_socket_replace", lighting: "electric_light_point", luminaire: "electric_luminaire_install", cooktop: "electric_dedicated_circuit", ev: "electric_ev", network: "electric_network_point" };
function detailedElectricalLines(input: EstimateInput, catalog: PriceItem[]) {
  const items = input.electricalMode === "pack" ? electricalPacks[input.electricalPack ?? "room"].items : input.electricalItems ?? [];
  const lines = items.map(item => makeLine(catalog, electricalKeys[item.kind], item.quantity));
  if (input.electricalPanel && input.electricalPanel !== "none") lines.push(makeLine(catalog, `electric_panel_${input.electricalPanel}_supply`), makeLine(catalog, "electric_panel_install"));
  if (!lines.length) throw new Error("Choisissez au moins un point electrique ou un tableau.");
  return lines;
}
function detailedPlumbingLines(fixtures: PlumbingFixture[], catalog: PriceItem[]) {
  return fixtures.flatMap(fixture => fixture.kind === "water_point" ? [makeLine(catalog, "plumbing_water_point_v2", fixture.quantity)] : fixture.kind === "removal" ? [makeLine(catalog, "plumbing_removal_only", fixture.quantity)] : [makeLine(catalog, `plumbing_${fixture.kind}_supply`, fixture.quantity), makeLine(catalog, `plumbing_${fixture.kind}_install`, fixture.quantity)]);
}
export function validateDetailedScope(input: EstimateInput): { field: keyof EstimateInput; message: string } | undefined {
  const types = new Set(input.projectTypes?.length ? input.projectTypes : [input.projectType]);
  const issue = (field: keyof EstimateInput, message: string) => ({field,message});
  if(types.has("kitchen_bath") && input.roomType==="kitchen" && input.bathroomMode!==undefined && input.bathroomMode!=="legacy" && input.surfaces?.kitchen_bath===undefined) return issue("bathroomMode","Précisez la surface réelle de la cuisine. La surface du logement n’est pas utilisée pour cette pièce.");
  if(types.has("electricity") && input.electricalMode === "items" && !input.electricalItems?.length && (!input.electricalPanel || input.electricalPanel === "none")) return issue("electricalItems","Choisissez un équipement électrique ou un tableau.");
  if(types.has("plumbing") && input.plumbingMode === "items" && !input.plumbingFixtures?.length && !input.includePlumbingDistribution && !input.includeWaterHeaterConnection) return issue("plumbingFixtures","Choisissez un sanitaire, un point d’eau ou une prestation réseau.");
  if (types.has("kitchen_bath") && input.roomType !== "kitchen" && input.bathroomMode === "standard_pack" && types.has("plumbing")) return issue("bathroomMode","Le pack salle de bain inclut les sanitaires. Retirez le lot plomberie ou choisissez les finitions seules.");
  if (types.has("plumbing") && input.plumbingMode === "items" && input.includePlumbingDistribution && input.plumbingFixtures?.some(item => item.kind === "water_point")) return issue("plumbingFixtures","Choisissez les points d’eau courts ou le forfait distribution, sans cumul.");
  if(types.has("kitchen_bath") && input.roomType!=="kitchen" && input.bathroomMode==="finishes" && input.bathroomFloorArea===undefined && input.bathroomWallArea===undefined) return issue("bathroomFloorArea","Précisez une surface de sol ou de murs à rénover.");
  const reserved = new Set<string>();
  if(types.has("electricity") && (input.electricalMode === "items" || input.electricalMode === "pack")) for(const key of ["electric_full","electric_partial","electric_panel","electric_point","electric_cooktop","electric_network"]) reserved.add(key);
  if(types.has("plumbing") && (input.plumbingMode === "items" || input.plumbingMode === "bathroom_pack")) for(const key of ["plumbing_point","plumbing_distribution","plumbing_shower","plumbing_bath","plumbing_basin","plumbing_wc","plumbing_sink"]) reserved.add(key);
  if (types.has("electricity") && input.electricalMode === "pack") for (const item of electricalPacks[input.electricalPack ?? "room"].items) reserved.add(electricalKeys[item.kind]);
  if(types.has("electricity") && input.electricalPanel && input.electricalPanel!=="none") for(const key of ["electric_panel_install",`electric_panel_${input.electricalPanel}_supply`]) reserved.add(key);
  if ((types.has("plumbing") && input.plumbingMode === "bathroom_pack") || (types.has("kitchen_bath") && input.bathroomMode === "standard_pack" && input.roomType !== "kitchen")) for (const fixture of bathroomPackFixtures) { reserved.add(`plumbing_${fixture.kind}_supply`); reserved.add(`plumbing_${fixture.kind}_install`); }
  if(types.has("kitchen_bath") && input.bathroomMode === "standard_pack" && input.roomType !== "kitchen") for(const key of ["bathroom","italian_shower","plumbing_point","plumbing_distribution","plumbing_shower","plumbing_basin","plumbing_wc"]) reserved.add(key);
  if(types.has("plumbing") && input.includePlumbingDistribution && (input.plumbingMode === "items" || input.plumbingMode === "bathroom_pack")) {reserved.add("plumbing_distribution_v2");reserved.add("plumbing_water_point_v2");}
  if(types.has("kitchen_bath") && input.roomType!=="kitchen" && input.bathroomFloorArea!==undefined && (input.bathroomMode === "standard_pack" || input.bathroomMode === "finishes")) reserved.add("bathroom_floor_finish");
  if(types.has("kitchen_bath") && input.roomType!=="kitchen" && input.bathroomWallArea!==undefined && (input.bathroomMode === "standard_pack" || input.bathroomMode === "finishes")) reserved.add("bathroom_wall_finish");
  if (input.customItems?.some(item => reserved.has(item.key))) return issue("customItems","Une option recouvre le pack ou une prestation déjà retenue. Retirez cette option ; utilisez les quantités du mode à la carte pour adapter le contenu.");
}

function buildLinesForType(input: EstimateInput, projectType: ProjectType, catalog: PriceItem[]): EstimateLine[] {
  input = { ...input, surface: input.surfaces?.[projectType] ?? input.surface };
  const lineFromItem = (...args: [string, number?, string?, number?]) => makeLine(catalog, ...args);
  if (projectType === "windows") return windowLines(input, catalog);
  if (projectType === "insulation") {
    const quantity = input.surface ?? 80;
    const key = input.insulationFinish === "cladding" ? "ite_cladding" : input.insulationFinish === "unknown" ? "inside_wall" : `ite_${input.insulationMaterial ?? "pse"}`;
    const lines = [lineFromItem(key, quantity)];
    if (input.insulationThickness) lines[0].description += ` Epaisseur declaree : ${input.insulationThickness} mm, a confirmer techniquement. Aucun supplement automatique d'epaisseur.`;
    if (input.includeScaffold && input.insulationFinish !== "unknown") lines.push(lineFromItem("scaffold_simple", quantity));
    return lines;
  }
  if (projectType === "electricity") {
    if (input.electricalMode === "items" || input.electricalMode === "pack") return detailedElectricalLines(input, catalog);
    const surface = input.surface ?? 80;
    const lines = [lineFromItem(input.electricalScope === "partial" ? "electric_partial" : "electric_full", surface)];
    if (input.includePanel) lines.push(lineFromItem("electric_panel"));
    const items = input.electricalItems ?? [{ kind: "socket", quantity: input.electricalPoints ?? 0 }];
    for (const item of items) {
      const key = item.kind === "cooktop" ? "electric_cooktop" : item.kind === "ev" ? "electric_ev" : item.kind === "network" ? "electric_network" : "electric_point";
      if (item.quantity > 0) lines.push(lineFromItem(key, item.quantity));
    }
    return lines;
  }
  if (projectType === "plumbing") {
    if (input.plumbingMode === "items" || input.plumbingMode === "bathroom_pack") {
      const fixtures = input.plumbingMode === "bathroom_pack" ? bathroomPackFixtures : input.plumbingFixtures ?? [];
      const lines = detailedPlumbingLines(fixtures, catalog);
      if (input.includePlumbingDistribution) lines.push(lineFromItem("plumbing_distribution_v2"));
      if (input.includeWaterHeaterConnection) lines.push(lineFromItem("water_heater_connection"));
      if (!lines.length) throw new Error("Choisissez au moins un sanitaire ou un point d'eau.");
      return lines;
    }
    const fixtures = input.plumbingFixtures ?? [{ kind: "water_point", quantity: input.plumbingPoints ?? 1 }];
    const lines = fixtures.map((fixture) => fixture.kind === "water_point" ? lineFromItem("plumbing_point", fixture.quantity) : lineFromItem(`plumbing_${fixture.kind}`, fixture.quantity));
    lines.push(lineFromItem("plumbing_distribution"));
    if (input.includeWaterHeaterConnection) lines.push(lineFromItem("water_heater_connection"));
    return lines;
  }
  if (projectType === "global") {
    const combined = new Set(input.projectTypes?.length ? input.projectTypes : [input.projectType]).size > 1;
    if (combined) return [lineFromItem("coordination")];
    const key = input.globalLevel === "full" ? "global_full" : input.globalLevel === "light" ? "global_light" : "global_medium";
    return [lineFromItem(key, input.surface ?? 90), lineFromItem("coordination")];
  }
  if (projectType === "hvac") {
    // Legacy "pac" retains an air/water hypothesis; sizing never changes the technology silently.
    if (input.hvacType === "pac") return [lineFromItem("pac_air_water")];
    return [lineFromItem(input.hvacType ?? "vmc_hygro")];
  }
  if (projectType === "roofing") return [lineFromItem(input.globalLevel === "full" ? "roof_renovation" : "roof_repair", input.surface ?? 60), ...(input.access === "difficult" ? [lineFromItem("framework_repair")] : [])];
  if (projectType === "kitchen_bath" && input.roomType !== "kitchen" && (input.bathroomMode === "standard_pack" || input.bathroomMode === "finishes")) {
    const lines = input.bathroomMode === "standard_pack" ? detailedPlumbingLines(bathroomPackFixtures, catalog) : [];
    if (input.bathroomFloorArea !== undefined) lines.push(lineFromItem("bathroom_floor_finish", input.bathroomFloorArea));
    if (input.bathroomWallArea !== undefined) lines.push(lineFromItem("bathroom_wall_finish", input.bathroomWallArea));
    if (!lines.length) throw new Error("Precisez une surface de sol ou de murs a renover.");
    return lines;
  }
  return [lineFromItem(projectType === "kitchen_bath" ? (input.roomType ?? "bathroom") : "global_light", input.surface ?? (projectType === "kitchen_bath" ? 7 : 20))];
}

function buildLines(input: EstimateInput, catalog: PriceItem[]): EstimateLine[] {
  const types = [...new Set(input.projectTypes?.length ? input.projectTypes : [input.projectType])];
  const lines = types.flatMap((type) => buildLinesForType(input, type, catalog));
  for (const custom of input.customItems ?? []) {
    lines.push(makeLine(catalog, custom.key, custom.quantity));
  }
  return lines;
}

function energyStudy(input: EstimateInput, mid: number) {
  if (!input.projectTypes?.includes("global") && input.projectType !== "global" && !input.energy?.annualConsumption) return undefined;
  const energy = input.energy ?? {};
  const currentAnnualCost = energy.annualEnergyCost ?? 0;
  if (currentAnnualCost <= 0) return undefined;
  let gain = energy.insulation === "none" ? 0.32 : energy.insulation === "partial" ? 0.22 : 0.12;
  if (energy.currentDpe === "F_G") gain += 0.12;
  if (energy.solar) gain += 0.1;
  const annualSavings = Math.round(currentAnnualCost * clamp(gain, 0.08, 0.65));
  return { annualSavings, paybackYears: annualSavings ? Math.round((mid / annualSavings) * 10) / 10 : 0, currentAnnualCost: Math.round(currentAnnualCost), energyGainPercent: Math.round(clamp(gain, 0.08, 0.65) * 100) };
}

export function estimateProject(input: EstimateInput, catalog: PriceItem[] = priceItems): EstimateResult {
  const scopeError=validateDetailedScope(input);
  if(scopeError) throw new Error(scopeError.message);
  const projectTypes = [...new Set(input.projectTypes?.length ? input.projectTypes : [input.projectType])];
  const rawLines = buildLines(input, catalog);
  const coefficient = regionCoefficient() * pricingCoefficients.access[input.access ?? "simple"] * pricingCoefficients.urgency[input.urgency];
  const lines = rawLines.map(line => ({ ...line, low: Math.round(line.low * coefficient), mid: Math.round(line.mid * coefficient), high: Math.round(line.high * coefficient) }));
  const totals = lines.reduce((acc, line) => ({ low: acc.low + line.low, mid: acc.mid + line.mid, high: acc.high + line.high }), { low: 0, mid: 0, high: 0 });
  const low = totals.low;
  const mid = totals.mid;
  const high = totals.high;
  const energy = energyStudy(input, mid);
  const vatRates = [...new Set(lines.map((line) => line.vatRate))];
  const maturityScore = Math.min(100, 35 + (input.city ? 10 : 0) + (input.surface || input.quantity || input.windowItems?.length ? 15 : 0) + (input.urgency !== "info" ? 15 : 0) + (input.projectType !== "other" ? 15 : 0) + (input.projectType === "global" && input.energy?.annualConsumption ? 10 : 0));
  const durationMap: Record<ProjectType, string> = { windows: "1 a 8 jours selon les ouvrants", insulation: "2 a 5 semaines", electricity: "3 jours a 3 semaines", plumbing: "1 a 10 jours", global: "6 a 16 semaines", hvac: "1 a 5 jours", kitchen_bath: "2 a 5 semaines", roofing: "2 jours a 4 semaines", other: "A preciser apres echange" };
  const roadmap: string[] = projectTypes.includes("global") ? ["Releve logement et analyse des consommations", "Priorisation isolation, ventilation et chauffage", "Chiffrage des variantes et verification technique", "Planning des lots et suivi des consommations"] : ["Validation des quantites et des supports", "Choix des materiels ou equivalents", "Visite technique et devis detaille", "Planification puis suivi de chantier"];
  const detailedAssumptions: string[] = [];
  if(projectTypes.includes("electricity")) detailedAssumptions.push(input.electricalMode==="pack" ? electricalPacks[input.electricalPack??"room"].label+". Quantités incluses, sans forfait m² ; seules les options explicites de tableau s’ajoutent." : input.electricalMode==="items" ? "Électricité à la carte : seules les quantités et le tableau explicitement choisis sont chiffrés, sans forfait au m²." : "Électricité historique : budget au m² et équipements complémentaires, périmètre à valider avant devis.");
  if(projectTypes.includes("plumbing")) detailedAssumptions.push(input.plumbingMode==="bathroom_pack" ? "Pack sanitaires : une douche, un meuble simple vasque et un WC à poser, fourniture et pose sur attentes existantes. Sols/murs et nouveau réseau exclus sauf lignes explicites." : input.plumbingMode==="items" ? "Plomberie à la carte : fourniture et pose séparées, aucune distribution globale ajoutée automatiquement. La dépose courante est comprise dans les lignes de pose ; une dépose seule concerne un autre appareil." : "Plomberie historique : distribution au forfait et sanitaires, périmètre à valider avant devis.");
  if(projectTypes.includes("kitchen_bath") && input.roomType!=="kitchen" && input.bathroomMode==="standard_pack") detailedAssumptions.push("Pack salle de bain : une douche, un meuble simple vasque, un WC à poser. Sol et murs uniquement selon les surfaces déclarées ; réseau neuf, électricité et étanchéité de douche italienne exclus.");
  return {
    low, mid, high, duration: projectTypes.map((type) => durationMap[type]).join(" + "), complexity: coefficient > 1.45 || projectTypes.includes("global") || projectTypes.length > 2 ? "complexe" : coefficient > 1.15 ? "standard" : "simple", maturityScore, lines,
    tvaRate: vatRates.length === 1 && typeof vatRates[0] === "number" ? vatRates[0] : null,
    offers: [
      { name: "Essentiel", price: low, summary: "Le périmètre demandé, dimensionné sur les quantités saisies.", included: ["Fourniture et pose selon configuration", "Hypothèses visibles", "Validation technique"] },
      { name: "Confort", price: mid, summary: "Le scénario équilibré avec les protections et adaptations utiles.", included: ["Tout le périmètre Essentiel", "Options et reprises principales", "Planning prévisionnel"] },
      { name: "Complet", price: high, summary: "Le scénario le plus complet pour traiter les points connexes identifiés.", included: ["Tout le périmètre Confort", "Variantes matériel ou équivalent", "Feuille de route chantier"] }
    ],
    roadmap,
    roi: energy,
    assumptions: [...detailedAssumptions, "Prix indicatifs à confirmer avec les fournisseurs, le métré et la visite technique.", "Catalogue calibre pour l'Ile-de-France, sans majoration de zone supplementaire. Les coefficients d'acces et de delai sont appliques aux lignes. TVA a confirmer, aides non deduites.", ...(projectTypes.includes("global") && projectTypes.length > 1 ? ["Global combine : seuls les lots detailles et la coordination sont chiffres ; les autres travaux ne sont pas inclus."] : []), "Les aides publiques ne sont pas déduites automatiquement car leurs règles évoluent.", ...(energy ? ["Le ROI énergie est une pré-étude fondée sur la consommation déclarée, le coût annuel fourni par le client et des gains théoriques ; il doit être confirmé par un audit."] : [])]
  };
}
