import type { EstimateInput, WindowItem } from "../../lib/pricing/estimate-engine";
import type { ProjectType } from "../../lib/pricing/price-data";
import { estimateInputSchema } from "../../lib/validators/estimate.schema";
import { changeWindowKind } from "../../lib/pricing/window-config";

export const estimatorSteps = ["selection", "details", "budget", "contact"] as const;
export type EstimatorStep = typeof estimatorSteps[number];
export const projectDraftKey = "a2e-project-v2";

export const newWindow = (): WindowItem => ({ kind: "window", quantity: 1, material: "pvc", width: 125, height: 135, opening: "french", installPack: "renovation", shutter: false });
export function initialEstimate(): EstimateInput {
  return { projectType: "windows", projectTypes: ["windows"], city: "Île-de-France", postalCode: "", surface: 80, material: "pvc", finish: "standard", urgency: "normal", access: "simple", windowItems: [newWindow()], electricalMode:"items", electricalPanel:"none", electricalItems: [{ kind: "socket", quantity: 1 }], plumbingMode:"items", plumbingFixtures: [{ kind: "shower", quantity: 1 }], includePanel: false, includePlumbingDistribution:false, bathroomMode:"standard_pack", energy: { energyType: "electricity", currentDpe: "unknown", insulation: "unknown", household: 2, solar: false }, customItems: [] };
}

export function selectedProjectTypes(input: EstimateInput): ProjectType[] {
  return [...new Set(input.projectTypes?.length ? input.projectTypes : [input.projectType])];
}
export function toggleProjectType(input: EstimateInput, type: ProjectType): EstimateInput {
  const active = selectedProjectTypes(input);
  const next = active.includes(type) ? active.filter((item) => item !== type) : [...active, type];
  const projectTypes = next.length ? next : [type];
  return { ...input, projectType: projectTypes[0], projectTypes };
}
export function updateProjectDomain(input: EstimateInput, type: ProjectType, partial: Partial<EstimateInput>): EstimateInput {
  return partial.surface === undefined ? { ...input, ...partial } : { ...input, ...partial, surface: input.surface, surfaces: { ...input.surfaces, [type]: partial.surface } };
}
export function restoreProjectDraft(raw: string | null): EstimateInput | null {
  if (!raw) return null;
  try {
    const saved = estimateInputSchema.safeParse(JSON.parse(raw));
    return saved.success ? { ...saved.data, windowItems: saved.data.windowItems?.map((item) => changeWindowKind(item, item.kind)) } : null;
  } catch { return null; }
}

// Homepage inputs are only a starting configuration, never a client price.
export function quickBudgetFromSearch(search: URLSearchParams): EstimateInput | null {
  const lot = search.get("lot");
  const raw = search.get("quantite");
  if (!lot || !["windows", "insulation", "electricity", "plumbing", "hvac", "global"].includes(lot) || !raw || !/^\d+(?:\.\d{1,2})?$/.test(raw)) return null;
  const quantity = Number(raw);
  const isCount = lot === "windows" || lot === "plumbing" || lot === "electricity";
  if (!Number.isFinite(quantity) || quantity <= 0 || quantity > (isCount ? 1000 : 100000) || (isCount && !Number.isInteger(quantity))) return null;
  return buildExpressProjectInput(lot as ExpressProjectType, quantity);
}

export type ExpressProjectType = "windows" | "insulation" | "electricity" | "plumbing" | "hvac" | "global";
export function buildExpressProjectInput(projectType: ExpressProjectType, quantity: number): EstimateInput {
  const input: EstimateInput = { ...initialEstimate(), projectType, projectTypes: [projectType], includePanel: false, electricalScope: "partial", insulationFinish: "render", insulationMaterial: "pse", includeScaffold: false, globalLevel: "medium", energy: undefined };
  if (projectType === "windows") input.windowItems = [{ ...newWindow(), quantity }];
  else if (projectType === "plumbing") input.plumbingFixtures = [{ kind: "water_point", quantity }];
  else if (projectType === "hvac") input.hvacType = "pac_air_water";
  else input.surfaces = { [projectType]: quantity };
  if (projectType === "electricity") { input.electricalItems = [{kind:"socket",quantity}]; input.surfaces=undefined; }
  return estimateInputSchema.parse(input);
}

export function canVisitStep(target: EstimatorStep, furthest: EstimatorStep, hasResult: boolean): boolean {
  const targetIndex = estimatorSteps.indexOf(target);
  return targetIndex <= estimatorSteps.indexOf(furthest) && (targetIndex < 2 || hasResult);
}

export function validateProjectFields(input: EstimateInput): { message: string; type?: ProjectType } | null {
  const parsed = estimateInputSchema.safeParse(input);
  if (parsed.success) return null;
  const path = parsed.error.issues[0].path;
  const field = String(path[0]);
  const type: ProjectType | undefined = field === "windowItems" ? "windows" : field === "electricalItems" ? "electricity" : field === "plumbingFixtures" ? "plumbing" : field.startsWith("bathroom") ? "kitchen_bath" : field === "energy" ? "global" : field === "surfaces" ? path[1] as ProjectType : undefined;
  if(parsed.error.issues[0].code==="custom") return {message:parsed.error.issues[0].message,type};
  const message = field === "postalCode" ? "Saisissez un code postal de 5 chiffres, ou laissez-le vide." : field === "windowItems" ? "Vérifiez les ouvrants : quantité entière de 1 à 1 000, dimensions de 30 à 1 000 cm." : field === "electricalItems" || field === "plumbingFixtures" ? "Chaque équipement doit avoir une quantité entière de 1 à 1 000." : field === "energy" ? "Vérifiez les informations énergie : valeurs positives, facture jusqu’à 100 000 € et consommation jusqu’à 1 000 000 kWh." : "Vérifiez les surfaces et quantités : valeurs strictement positives, jusqu’à 100 000.";
  return { message, type };
}
