import type { PriceItem, ProjectType } from "./price-data";

export const categoryLabels: Record<ProjectType, string> = {
  windows: "Menuiseries", insulation: "Isolation", electricity: "Electricite", plumbing: "Plomberie",
  global: "Renovation globale", hvac: "Chauffage & ventilation", kitchen_bath: "Cuisine & salle de bain", roofing: "Toiture", other: "Autre"
};
export const unitLabels: Record<PriceItem["unit"], string> = { unit: "unite", m2: "m2", point: "point", forfait: "forfait" };
export const catalogColumns = ["key", "label", "category", "unit", "low", "mid", "high", "vatRate", "reference", "description"] as const;
export const MAX_CATALOG_ROWS = 500;
export const MAX_CATALOG_BYTES = 512_000;
export class CatalogError extends Error {}

function amount(value: unknown, field: string) {
  const parsed = typeof value === "number" ? value : typeof value === "string" && /^\d+(?:[.,]\d+)?$/.test(value.trim()) ? Number(value.trim().replace(",", ".")) : NaN;
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 10_000_000) throw new CatalogError(`${field} : montant positif ou nul attendu (maximum 10 000 000).`);
  return parsed;
}

export function validatePriceItem(input: unknown): PriceItem & { vatRate: number } {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new CatalogError("Ligne tarifaire invalide.");
  const body = input as Record<string, unknown>;
  const string = (field: string, max: number, required = false) => {
    const value = typeof body[field] === "string" ? (body[field] as string).trim() : "";
    if ((required && !value) || value.length > max) throw new CatalogError(`${field} : ${required ? "valeur requise, " : ""}maximum ${max} caracteres.`);
    return value;
  };
  const key = string("key", 80, true);
  if (!/^[a-z0-9][a-z0-9_]*$/.test(key)) throw new CatalogError("key : lettres minuscules, chiffres et underscores uniquement.");
  const label = string("label", 160, true);
  const category = string("category", 30, true) as ProjectType;
  const unit = string("unit", 20, true) as PriceItem["unit"];
  if (!Object.prototype.hasOwnProperty.call(categoryLabels, category)) throw new CatalogError("Categorie inconnue.");
  if (!Object.prototype.hasOwnProperty.call(unitLabels, unit)) throw new CatalogError("Unite inconnue.");
  const low = amount(body.low, "low"), mid = amount(body.mid, "mid"), high = amount(body.high, "high");
  if (low > mid || mid > high) throw new CatalogError("Les prix doivent respecter : bas <= central <= haut.");
  const vatRate = body.vatRate === undefined || body.vatRate === "" ? 10 : amount(body.vatRate, "vatRate");
  if (![5.5, 10, 20].includes(vatRate)) throw new CatalogError("TVA : choisissez 5,5 %, 10 % ou 20 %.");
  const cents = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
  return { key, label, category, unit, low: cents(low), mid: cents(mid), high: cents(high), vatRate, reference: string("reference", 160), description: string("description", 500) };
}

/** RFC 4180 quoting, accepting the separator used by French Excel. */
export function parseDelimited(text: string): string[][] {
  const content = text.replace(/^\uFEFF/, "");
  if (!content.trim()) throw new CatalogError("Le fichier est vide.");
  const firstLine = content.split(/\r?\n/, 1)[0];
  const separator = firstLine.includes(";") ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [], field = "", quoted = false, closed = false;
  for (let index = 0; index < content.length; index++) {
    const character = content[index];
    if (quoted) {
      if (character === '"' && content[index + 1] === '"') { field += '"'; index++; }
      else if (character === '"') { quoted = false; closed = true; }
      else field += character;
    } else if (character === '"') {
      if (field || closed) throw new CatalogError("Guillemets CSV mal formes.");
      quoted = true;
    } else if (character === separator) { row.push(field); field = ""; closed = false; }
    else if (character === "\n" || character === "\r") {
      if (character === "\r" && content[index + 1] === "\n") index++;
      row.push(field);
      if (row.some((value) => value.trim())) rows.push(row);
      row = []; field = ""; closed = false;
    } else {
      if (closed && character.trim()) throw new CatalogError("Caractere inattendu apres un champ CSV.");
      if (!closed) field += character;
    }
  }
  if (quoted) throw new CatalogError("Champ CSV non ferme.");
  row.push(field);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

export function parseCatalogCsv(text: string): Array<ReturnType<typeof validatePriceItem>> {
  if (text.length > MAX_CATALOG_BYTES) throw new CatalogError("Le fichier depasse 500 Ko.");
  const [header, ...rows] = parseDelimited(text);
  const normalizedHeader = header.map((value) => value.trim());
  if (new Set(normalizedHeader).size !== normalizedHeader.length || catalogColumns.some((column) => !normalizedHeader.includes(column))) throw new CatalogError(`Colonnes attendues : ${catalogColumns.join("; ")}. Exportez le catalogue pour obtenir le modele.`);
  if (!rows.length || rows.length > MAX_CATALOG_ROWS) throw new CatalogError(`Le fichier doit contenir entre 1 et ${MAX_CATALOG_ROWS} lignes.`);
  const keys = new Set<string>();
  return rows.map((row, index) => {
    try {
      if (row.length !== header.length) throw new CatalogError("Nombre de colonnes incorrect.");
      const item = validatePriceItem(Object.fromEntries(normalizedHeader.map((column, columnIndex) => [column, row[columnIndex].replace(/^'(?='*[\t\r\n ]*[=+@-])/, "")])));
      if (keys.has(item.key)) throw new CatalogError(`Cle dupliquee : ${item.key}.`);
      keys.add(item.key);
      return item;
    } catch (error) { throw new CatalogError(`Ligne ${index + 2} : ${error instanceof Error ? error.message : "invalide"}`); }
  });
}

export function csvCell(value: unknown) {
  let text = value === undefined || value === null ? "" : String(value);
  if (/^'*[\t\r\n ]*[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function exportCatalogCsv(items: PriceItem[]) {
  return "\uFEFF" + [catalogColumns.join(";"), ...items.map((item) => catalogColumns.map((column) => csvCell(item[column] ?? (column === "vatRate" ? 10 : ""))).join(";"))].join("\r\n");
}
