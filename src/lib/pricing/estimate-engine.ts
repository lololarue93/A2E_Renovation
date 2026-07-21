import { minimumIntervention, priceItems, pricingCoefficients, type ProjectType } from "./price-data";

export type WindowItem = {
  kind: "window" | "door_window" | "entry_door" | "bay";
  quantity: number;
  material: "pvc" | "alu";
  width: number;
  height: number;
  opening: "fixed" | "french" | "oscillo" | "sliding";
  installPack: "renovation" | "total";
  shutter: boolean;
};

export type ElectricalItem = { kind: "socket" | "lighting" | "cooktop" | "ev" | "network"; quantity: number };
export type PlumbingFixture = { kind: "shower" | "bath" | "basin" | "wc" | "sink" | "water_point"; quantity: number };
export type EnergyInput = {
  annualConsumption?: number;
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
  quantity?: number;
  material?: "pvc" | "alu" | "wood" | "mixed";
  windowWidth?: number;
  windowHeight?: number;
  opening?: "fixed" | "french" | "oscillo" | "sliding";
  installPack?: "renovation" | "total";
  windowItems?: WindowItem[];
  insulationFinish?: "render" | "cladding" | "unknown";
  insulationThickness?: number;
  globalLevel?: "light" | "medium" | "full";
  electricalScope?: "partial" | "full";
  electricalPoints?: number;
  electricalItems?: ElectricalItem[];
  plumbingPoints?: number;
  plumbingFixtures?: PlumbingFixture[];
  includePanel?: boolean;
  includeWaterHeaterConnection?: boolean;
  hvacType?: "pac" | "vmc_simple" | "vmc_hygro" | "vmc_double" | "water_heater";
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
  tvaRate: number;
  offers: EstimateOffer[];
  roadmap: string[];
  roi?: { annualSavings: number; paybackYears: number; currentAnnualCost: number; energyGainPercent: number };
};

const euroRound = (value: number) => Math.round(value / 50) * 50;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const findItem = (key: string) => priceItems.find((item) => item.key === key)!;

function regionCoefficient(city?: string, postalCode?: string) {
  const normalizedCity = city?.toLowerCase() ?? "";
  if (normalizedCity.includes("paris") || postalCode?.startsWith("75")) return pricingCoefficients.region.paris;
  return pricingCoefficients.region.ileDeFrance;
}

function lineFromItem(key: string, quantity = 1, label?: string, multiplier = 1): EstimateLine {
  const item = findItem(key);
  const displayLabel = label ?? item.label;
  const categoryDescription = item.category === "windows" ? "Gamme basse : PVC blanc et double vitrage standard. Gamme centrale : ouvrant renforcé, finitions et réglages adaptés. Gamme haute : profilés, vitrage et accessoires renforcés selon le projet." : item.category === "insulation" ? "Gamme basse : isolant et finition standard. Gamme centrale : épaisseur et traitement des points singuliers. Gamme haute : finition renforcée, performances et adaptations de façade." : item.category === "hvac" ? "Gamme basse : équipement dimensionné sur besoin simple. Gamme centrale : régulation, raccordements et mise en service. Gamme haute : dimensionnement renforcé et contraintes techniques complémentaires." : "Gamme basse : fourniture et mise en œuvre standard. Gamme centrale : adaptations, réglages et contrôles usuels. Gamme haute : finitions, contraintes d'accès et matériel renforcé.";
  return { label: item.reference ? `${displayLabel} - ${item.reference}` : displayLabel, quantity, unit: item.unit, low: item.low * quantity * multiplier, mid: item.mid * quantity * multiplier, high: item.high * quantity * multiplier, reference: item.reference ?? "Matériel ou équivalent à valider lors de la visite technique", description: item.description ?? categoryDescription, vatRate: item.vatRate ?? (item.category === "windows" || item.category === "insulation" || item.category === "hvac" ? 5.5 : 10) };
}

function windowLines(input: EstimateInput) {
  const items = input.windowItems?.length ? input.windowItems : [{ kind: "window", quantity: Math.max(1, input.quantity ?? 1), material: input.material === "alu" ? "alu" : "pvc", width: input.windowWidth ?? 125, height: input.windowHeight ?? 135, opening: input.opening ?? "french", installPack: input.installPack ?? "renovation", shutter: Boolean(input.shutters) }];
  const lines: EstimateLine[] = [];
  for (const item of items) {
    const area = (item.width * item.height) / 10000;
    const key = item.kind === "entry_door" ? (item.material === "alu" ? "entry_door_alu" : "entry_door_pvc") : item.kind === "bay" ? (item.material === "alu" ? "sliding_alu" : "bay_pvc") : item.kind === "door_window" ? "door_window_pvc" : item.material === "alu" ? "window_alu" : "window_pvc";
    const baseArea = item.kind === "entry_door" ? 1.9 : item.kind === "bay" ? 3.8 : 1.7;
    const dimensionFactor = clamp(0.78 + area / baseArea * 0.22, 0.78, 2.2);
    lines.push(lineFromItem(key, item.quantity, `${item.kind === "entry_door" ? "Porte d'entree" : item.kind === "bay" ? "Baie vitree" : item.kind === "door_window" ? "Porte-fenetre" : "Fenetre"} ${item.material.toUpperCase()} - ${item.width} x ${item.height} cm`, dimensionFactor));
    lines.push(lineFromItem(item.installPack === "total" ? "pose_total" : "pose_renovation", item.quantity));
    if (item.opening === "oscillo") lines.push(lineFromItem("oscillo_battant", item.quantity));
    if (item.shutter) lines.push(lineFromItem("shutter_motor", item.quantity));
    if (area > 2.5) lines.push(lineFromItem("oversize_joinery", item.quantity, "Grande dimension / manutention"));
  }
  if (input.acoustic) lines.push(lineFromItem("acoustic", items.reduce((sum, item) => sum + item.quantity, 0)));
  return lines;
}

function buildLinesForType(input: EstimateInput, projectType: ProjectType): EstimateLine[] {
  if (projectType === "windows") return windowLines(input);
  if (projectType === "insulation") {
    const quantity = Math.max(20, input.surface ?? 80);
    const key = input.insulationFinish === "cladding" ? "ite_cladding" : input.insulationFinish === "unknown" ? "inside_wall" : "ite_pse";
    const lines = [lineFromItem(key, quantity, undefined, input.insulationThickness && input.insulationThickness > 140 ? 1.12 : 1)];
    if (input.insulationFinish !== "unknown") lines.push(lineFromItem("scaffold_simple", quantity));
    return lines;
  }
  if (projectType === "electricity") {
    const surface = Math.max(20, input.surface ?? 80);
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
    const fixtures = input.plumbingFixtures ?? [{ kind: "water_point", quantity: Math.max(1, input.plumbingPoints ?? 1) }];
    const lines = fixtures.map((fixture) => fixture.kind === "water_point" ? lineFromItem("plumbing_point", fixture.quantity) : lineFromItem(`plumbing_${fixture.kind}`, fixture.quantity));
    lines.push(lineFromItem("plumbing_distribution"));
    if (input.includeWaterHeaterConnection) lines.push(lineFromItem("water_heater_connection"));
    return lines;
  }
  if (projectType === "global") {
    const key = input.globalLevel === "full" ? "global_full" : input.globalLevel === "light" ? "global_light" : "global_medium";
    return [lineFromItem(key, Math.max(20, input.surface ?? 90)), lineFromItem("coordination")];
  }
  if (projectType === "hvac") {
    if (input.hvacType === "pac") {
      const annual = input.energy?.annualConsumption ?? 0;
      const surface = input.surface ?? 80;
      const key = surface <= 80 && annual < 12000 ? "pac_air_air" : surface > 150 || annual >= 22000 ? "pac_air_water_large" : "pac_air_water";
      return [lineFromItem(key)];
    }
    return [lineFromItem(input.hvacType ?? "vmc_hygro")];
  }
  if (projectType === "roofing") return [lineFromItem(input.globalLevel === "full" ? "roof_renovation" : "roof_repair", Math.max(10, input.surface ?? 60)), ...(input.access === "difficult" ? [lineFromItem("framework_repair")] : [])];
  return [lineFromItem(projectType === "kitchen_bath" ? "bathroom" : "global_light", Math.max(projectType === "kitchen_bath" ? 4 : 10, input.surface ?? (projectType === "kitchen_bath" ? 7 : 20)))];
}

function buildLines(input: EstimateInput): EstimateLine[] {
  const types = [...new Set(input.projectTypes?.length ? input.projectTypes : [input.projectType])];
  const lines = types.flatMap((type) => buildLinesForType(input, type));
  for (const custom of input.customItems ?? []) {
    if (custom.quantity > 0 && priceItems.some((item) => item.key === custom.key)) lines.push(lineFromItem(custom.key, custom.quantity));
  }
  return lines;
}

function energyStudy(input: EstimateInput, mid: number) {
  if (!input.projectTypes?.includes("global") && input.projectType !== "global" && !input.energy?.annualConsumption) return undefined;
  const energy = input.energy ?? {};
  const unitCost = energy.energyType === "gas" ? 0.11 : energy.energyType === "fuel" ? 0.14 : 0.25;
  const currentAnnualCost = (energy.annualConsumption ?? 0) * unitCost;
  let gain = energy.insulation === "none" ? 0.32 : energy.insulation === "partial" ? 0.22 : 0.12;
  if (energy.currentDpe === "F_G") gain += 0.12;
  if (energy.solar) gain += 0.1;
  const annualSavings = Math.round(currentAnnualCost * clamp(gain, 0.08, 0.65));
  return { annualSavings, paybackYears: annualSavings ? Math.round((mid / annualSavings) * 10) / 10 : 0, currentAnnualCost: Math.round(currentAnnualCost), energyGainPercent: Math.round(clamp(gain, 0.08, 0.65) * 100) };
}

export function estimateProject(input: EstimateInput): EstimateResult {
  const projectTypes = [...new Set(input.projectTypes?.length ? input.projectTypes : [input.projectType])];
  const lines = buildLines(input);
  const coefficient = regionCoefficient(input.city, input.postalCode) * pricingCoefficients.access[input.access ?? "simple"] * pricingCoefficients.urgency[input.urgency];
  const totals = lines.reduce((acc, line) => ({ low: acc.low + line.low, mid: acc.mid + line.mid, high: acc.high + line.high }), { low: 0, mid: 0, high: 0 });
  const low = euroRound(Math.max(totals.low * coefficient, minimumIntervention));
  const mid = euroRound(Math.max(totals.mid * coefficient, minimumIntervention));
  const high = euroRound(Math.max(totals.high * coefficient, minimumIntervention));
  const energy = energyStudy(input, mid);
  const maturityScore = Math.min(100, 35 + (input.city ? 10 : 0) + (input.surface || input.quantity || input.windowItems?.length ? 15 : 0) + (input.urgency !== "info" ? 15 : 0) + (input.projectType !== "other" ? 15 : 0) + (input.projectType === "global" && input.energy?.annualConsumption ? 10 : 0));
  const durationMap: Record<ProjectType, string> = { windows: "1 a 8 jours selon les ouvrants", insulation: "2 a 5 semaines", electricity: "3 jours a 3 semaines", plumbing: "1 a 10 jours", global: "6 a 16 semaines", hvac: "1 a 5 jours", kitchen_bath: "2 a 5 semaines", roofing: "2 jours a 4 semaines", other: "A preciser apres echange" };
  const roadmap: string[] = projectTypes.includes("global") ? ["Releve logement et analyse des consommations", "Priorisation isolation, ventilation et chauffage", "Chiffrage des variantes et verification technique", "Planning des lots et suivi des consommations"] : ["Validation des quantites et des supports", "Choix des materiels ou equivalents", "Visite technique et devis detaille", "Planification puis suivi de chantier"];
  return {
    low, mid, high, duration: projectTypes.map((type) => durationMap[type]).join(" + "), complexity: coefficient > 1.45 || projectTypes.includes("global") || projectTypes.length > 2 ? "complexe" : coefficient > 1.15 ? "standard" : "simple", maturityScore, lines,
    tvaRate: projectTypes.every((type) => type === "windows" || type === "insulation" || type === "hvac") ? 5.5 : 10,
    offers: [
      { name: "Essentiel", price: low, summary: "Le périmètre demandé, dimensionné sur les quantités saisies.", included: ["Fourniture et pose selon configuration", "Hypothèses visibles", "Validation technique"] },
      { name: "Confort", price: mid, summary: "Le scénario équilibré avec les protections et adaptations utiles.", included: ["Tout le périmètre Essentiel", "Options et reprises principales", "Planning prévisionnel"] },
      { name: "Complet", price: high, summary: "Le scénario le plus complet pour traiter les points connexes identifiés.", included: ["Tout le périmètre Confort", "Variantes matériel ou équivalent", "Feuille de route chantier"] }
    ],
    roadmap,
    roi: energy,
    assumptions: ["Prix indicatifs à confirmer avec les fournisseurs, le métré et la visite technique.", "Chaque ouvrant, équipement ou point ajouté augmente la précision du chiffrage.", "Les aides publiques ne sont pas déduites automatiquement car leurs règles évoluent.", ...(energy ? ["Le ROI énergie est une pré-étude fondée sur la consommation déclarée, le prix d'énergie saisi indirectement et des gains théoriques ; il doit être confirmé par un audit."] : [])]
  };
}
