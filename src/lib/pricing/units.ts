const abbreviations: Record<string, string> = { unit: "u.", unite: "u.", point: "pt", m2: "m²", forfait: "forf." };

export function shortPriceUnit(unit: string): string {
  return abbreviations[unit] ?? unit;
}
