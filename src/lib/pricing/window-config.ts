import type { WindowItem } from "./estimate-engine";

/** Materials offered by the current selector, matching the available reference variants. */
export function windowMaterialsForKind(kind: WindowItem["kind"]): ReadonlyArray<WindowItem["material"]> {
  return kind === "window" ? ["pvc", "alu", "wood"] : ["pvc", "alu"];
}

export function changeWindowKind(item: WindowItem, kind: WindowItem["kind"]): WindowItem {
  const allowed = windowMaterialsForKind(kind);
  return { ...item, kind, material: allowed.includes(item.material) ? item.material : "pvc" };
}
