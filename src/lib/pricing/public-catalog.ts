import type { PriceItem } from "./price-data";

// Display successors only when their complete scope exists in the loaded catalogue.
// Historic keys remain available to saved estimates and the administrator.
const successors: Record<string, string[]> = {
  electric_panel: ["electric_panel_2r8c_supply", "electric_panel_install"],
  electric_point: ["electric_socket_new", "electric_light_point"],
  electric_cooktop: ["electric_dedicated_circuit"],
  electric_network: ["electric_network_point"],
  plumbing_point: ["plumbing_water_point_v2"],
  plumbing_distribution: ["plumbing_distribution_v2"],
  ...Object.fromEntries(["shower", "bath", "basin", "wc", "sink"].map(kind => [`plumbing_${kind}`, [`plumbing_${kind}_supply`, `plumbing_${kind}_install`]])),
  bathroom: ["bathroom_floor_finish", "bathroom_wall_finish", "plumbing_shower_supply", "plumbing_shower_install", "plumbing_basin_supply", "plumbing_basin_install", "plumbing_wc_supply", "plumbing_wc_install"]
};

export function publicPriceReferences(items: PriceItem[]): PriceItem[] {
  const keys = new Set(items.map(item => item.key));
  return items.filter(item => !successors[item.key]?.every(key => keys.has(key)));
}

export function isHistoricSurfaceReference(item: PriceItem) {
  return item.key === "electric_full" || item.key === "electric_partial";
}
