import { z } from "zod";
import type { PriceItem } from "./price-data";
import { csvCell } from "./catalog-transfer";

const money = z.number().finite().min(0).max(10_000_000);
const lineSchema = z.object({
  id: z.string().uuid(), key: z.string().max(80), label: z.string().trim().min(1).max(160),
  category: z.enum(["windows", "insulation", "electricity", "plumbing", "global", "hvac", "kitchen_bath", "roofing", "other"]),
  unit: z.enum(["unit", "m2", "point", "forfait"]), quantity: z.number().finite().positive().max(1_000_000),
  low: money, mid: money, high: money, vatRate: z.union([z.literal(5.5), z.literal(10), z.literal(20)]),
  reference: z.string().max(160), description: z.string().max(500), source: z.enum(["catalog", "custom"]),
  useDimensions: z.boolean(), width: z.number().finite().positive().max(10_000), height: z.number().finite().positive().max(10_000)
}).refine((line) => line.low <= line.mid && line.mid <= line.high, "Chaque ligne doit respecter bas <= central <= haut.")
  .refine((line) => !line.useDimensions || line.unit === "m2", "Le calcul par dimensions est reserve aux lignes en m2.");

export const quoteSchema = z.object({
  version: z.literal(1), id: z.string().uuid(), number: z.string().trim().min(1).max(60), title: z.string().trim().min(1).max(160),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => { const parsed = new Date(`${value}T00:00:00Z`); return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value; }, "Date invalide"),
  client: z.string().max(160), email: z.string().max(254).refine((value) => value === "" || z.string().email().safeParse(value).success, "Email invalide"),
  phone: z.string().max(40), address: z.string().max(300), notes: z.string().max(2000),
  basis: z.enum(["unspecified", "ht", "ttc"]), status: z.enum(["draft", "review", "sent"]), validityDays: z.number().int().min(1).max(365),
  discountPercent: z.number().finite().min(0).max(15).default(0), discountReason: z.string().trim().max(300).default(""),
  lines: z.array(lineSchema).max(150)
}).refine((quote) => new Set(quote.lines.map((line) => line.id)).size === quote.lines.length, "Deux lignes ont le meme identifiant.")
  .refine((quote) => quote.discountPercent === 0 || quote.discountReason.length >= 3, "Indiquez un motif pour la remise commerciale.");

export type QuoteDraft = z.infer<typeof quoteSchema>;
export type QuoteLine = QuoteDraft["lines"][number];
export const quoteStatusLabels = { draft: "Brouillon", review: "A verifier", sent: "Remis au client" };
export const quoteBasisLabels = { unspecified: "Base fiscale a confirmer", ht: "Prix saisis HT", ttc: "Prix saisis TTC" };
export type Range = { low: number; mid: number; high: number };
const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function lineQuantity(line: QuoteLine) {
  return line.quantity * (line.useDimensions && line.unit === "m2" ? line.width * line.height : 1);
}

export function calculateQuote(quote: QuoteDraft) {
  const subtotal: Range = { low: 0, mid: 0, high: 0 };
  const discount: Range = { low: 0, mid: 0, high: 0 };
  const totals: Range = { low: 0, mid: 0, high: 0 };
  const tax: Range = { low: 0, mid: 0, high: 0 };
  const lines = quote.lines.map((line) => {
    const quantity = lineQuantity(line);
    const amounts = { low: round(line.low * quantity), mid: round(line.mid * quantity), high: round(line.high * quantity) };
    const discountedAmounts = { ...amounts };
    for (const scenario of ["low", "mid", "high"] as const) {
      const reduction = round(amounts[scenario] * (quote.discountPercent ?? 0) / 100);
      discountedAmounts[scenario] = round(amounts[scenario] - reduction);
      subtotal[scenario] = round(subtotal[scenario] + amounts[scenario]);
      discount[scenario] = round(discount[scenario] + reduction);
      totals[scenario] = round(totals[scenario] + discountedAmounts[scenario]);
      const lineTax = quote.basis === "ht" ? discountedAmounts[scenario] * line.vatRate / 100 : quote.basis === "ttc" ? discountedAmounts[scenario] - discountedAmounts[scenario] / (1 + line.vatRate / 100) : 0;
      tax[scenario] = round(tax[scenario] + round(lineTax));
    }
    return { ...line, effectiveQuantity: quantity, amounts, discountedAmounts };
  });
  const ht = quote.basis === "ttc" ? { low: round(totals.low - tax.low), mid: round(totals.mid - tax.mid), high: round(totals.high - tax.high) } : totals;
  const ttc = quote.basis === "ht" ? { low: round(totals.low + tax.low), mid: round(totals.mid + tax.mid), high: round(totals.high + tax.high) } : totals;
  return { lines, subtotal, discount, totals, tax, ht, ttc };
}

export function validateQuote(value: unknown) {
  const result = quoteSchema.safeParse(value);
  if (!result.success) throw new Error(result.error.issues.map((issue) => `${issue.path.join(".") || "Cotation"} : ${issue.message}`).slice(0, 3).join(" "));
  if (calculateQuote(result.data).subtotal.high > 100_000_000) throw new Error("Le total depasse la limite de 100 000 000 EUR.");
  return result.data;
}

export function newQuote(): QuoteDraft {
  const date = new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  return { version: 1, id: crypto.randomUUID(), number: `A2E-${date.replace(/-/g, "")}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`, title: "Etude de renovation", date, client: "", email: "", phone: "", address: "", notes: "Metre, acces, supports, raccordements et references a confirmer lors de la visite technique.", basis: "unspecified", status: "draft", validityDays: 30, discountPercent: 0, discountReason: "", lines: [] };
}

export function lineFromCatalog(item?: PriceItem): QuoteLine {
  return { id: crypto.randomUUID(), key: item?.key ?? "", label: item?.label ?? "Nouveau poste a definir", category: item?.category ?? "other", unit: item?.unit ?? "forfait", quantity: 1, low: item?.low ?? 0, mid: item?.mid ?? 0, high: item?.high ?? 0, vatRate: (item?.vatRate ?? 10) as QuoteLine["vatRate"], reference: item?.reference ?? "", description: item?.description ?? "", source: item ? "catalog" : "custom", useDimensions: false, width: 1, height: 1 };
}

export function exportQuoteCsv(quote: QuoteDraft) {
  const result = calculateQuote(quote);
  const rows: unknown[][] = [
    ["Document", quote.number, quote.title, "Date", quote.date, "Client", quote.client, "Base", quoteBasisLabels[quote.basis]],
    ["Poste", "Cle catalogue", "Unite", "Quantite calculee", "PU bas", "PU central", "PU haut", "Total bas", "Total central", "Total haut", "TVA indicative %", "Reference", "Description"],
    ...result.lines.map((line) => [line.label, line.key, line.unit, line.effectiveQuantity, line.low, line.mid, line.high, line.amounts.low, line.amounts.mid, line.amounts.high, line.vatRate, line.reference, line.description]),
    ["TOTAL AVANT REMISE", "", "", "", "", "", "", result.subtotal.low, result.subtotal.mid, result.subtotal.high],
    ["REMISE COMMERCIALE", quote.discountPercent, "%", quote.discountReason, "", "", "", result.discount.low, result.discount.mid, result.discount.high],
    ["TOTAL APRES REMISE", "", "", "", "", "", "", result.totals.low, result.totals.mid, result.totals.high],
    ...(quote.basis === "unspecified" ? [["TVA non calculee : base fiscale a confirmer"]] : [
      ["TOTAL HT", "", "", "", "", "", "", result.ht.low, result.ht.mid, result.ht.high],
      ["TVA INDICATIVE", "", "", "", "", "", "", result.tax.low, result.tax.mid, result.tax.high],
      ["TOTAL TTC", "", "", "", "", "", "", result.ttc.low, result.ttc.mid, result.ttc.high]
    ]),
    ["Reserves", quote.notes], ["Conditions", "Cotation indicative, sous reserve de visite technique. Aides non deduites. Validite", quote.validityDays, "jours"]
  ];
  return "\uFEFF" + rows.map((row) => row.map(csvCell).join(";")).join("\r\n");
}
