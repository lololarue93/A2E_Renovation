import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PDFDocument, StandardFonts, rgb, type PDFImage } from "pdf-lib";
import { calculateQuote, quoteBasisLabels, type QuoteDraft } from "../pricing/quote-workspace";
import { shortPriceUnit } from "../pricing/units";

const safe = (text: string) => text.replace(/\u0153/g, "oe").replace(/\u0152/g, "OE").replace(/[^\x20-\x7e\u00a0-\u00ff]/g, " ");
const euro = (amount: number) => `${amount.toLocaleString("fr-FR", { maximumFractionDigits: 2 }).replace(/[\u202f\u00a0]/g, " ")} EUR`;
const wrap = (text: string, width: number) => {
  const words = safe(text).match(new RegExp(`.{1,${width}}(?:\\s|$)|.{1,${width}}`, "g"));
  return (words ?? [""]).map((line) => line.trim());
};

export async function generateWorkspaceQuote(quote: QuoteDraft, phone: string) {
  const result = calculateQuote(quote);
  const pdf = await PDFDocument.create();
  pdf.setTitle(safe(`${quote.number} - ${quote.title}`));
  pdf.setAuthor("A2E Renovation");
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const navy = rgb(0.078, 0.18, 0.196), gold = rgb(0.635, 0.54, 0.376), pearl = rgb(0.96, 0.953, 0.925), white = rgb(1, 1, 1);
  let page = pdf.addPage([595, 842]);
  let y = 710;
  let logo: PDFImage | undefined;
  try { logo = await pdf.embedJpg(await readFile(join(process.cwd(), "public", "branding", "a2e-logo.jpeg"))); } catch { /* Text branding remains visible. */ }
  const header = () => {
    page.drawRectangle({ x: 0, y: 756, width: 595, height: 86, color: navy });
    if (logo) page.drawImage(logo, { x: 42, y: 769, width: 82, height: 53 });
    page.drawText("A2E RENOVATION", { x: logo ? 140 : 42, y: 805, font: bold, size: 19, color: white });
    page.drawText("COTATION INDICATIVE", { x: logo ? 140 : 42, y: 782, font: regular, size: 10, color: gold });
    page.drawText(safe(quote.number), { x: 390, y: 806, font: regular, size: 9, color: white });
    y = 725;
  };
  const ensure = (height: number) => { if (y - height < 80) { page = pdf.addPage([595, 842]); header(); } };
  const text = (value: string, size = 10, strong = false, max = 95) => {
    for (const line of wrap(value, max)) { ensure(size + 6); page.drawText(line, { x: 42, y, size, font: strong ? bold : regular, color: navy }); y -= size + 5; }
  };
  header();
  text(quote.title, 18, true, 55);
  y -= 9;
  text(`Client : ${quote.client || "A renseigner"}`, 11, true);
  for (const value of [quote.address, quote.email, quote.phone]) if (value) text(value, 9);
  text(`Date : ${quote.date} | Validite : ${quote.validityDays} jours | ${quoteBasisLabels[quote.basis]}`, 9);
  y -= 16;
  text("DETAIL DES POSTES", 11, true);
  y -= 8;
  for (const [index, line] of result.lines.entries()) {
    const labels = wrap(`${String(index + 1).padStart(2, "0")}  ${line.label}`, 54);
    const details = wrap([line.description, line.reference && `Reference : ${line.reference}`, line.useDimensions && `Metre : ${line.width} x ${line.height} m x ${line.quantity}`, `TVA indicative : ${line.vatRate} % | Prix unitaires : ${euro(line.low)} / ${euro(line.mid)} / ${euro(line.high)}`].filter(Boolean).join(" | "), 90);
    const height = labels.length * 13 + details.length * 11 + 40;
    ensure(height);
    page.drawRectangle({ x: 36, y: y - height + 12, width: 523, height, color: pearl });
    labels.forEach((value, labelIndex) => page.drawText(value, { x: 45, y: y - labelIndex * 13, size: 9, font: bold, color: navy }));
    y -= labels.length * 13 + 5;
    details.forEach((value) => { page.drawText(value, { x: 45, y, size: 8, font: regular, color: navy }); y -= 11; });
    const quantity = line.effectiveQuantity.toLocaleString("fr-FR", { maximumFractionDigits: 4 });
    page.drawText(safe(`${quantity} ${shortPriceUnit(line.unit)}`), { x: 45, y: y - 4, size: 8, font: bold, color: navy });
    for (const [scenarioIndex, scenario] of (["low", "mid", "high"] as const).entries()) page.drawText(`${["Bas", "Central", "Haut"][scenarioIndex]} : ${euro(line.amounts[scenario])}`, { x: 160 + scenarioIndex * 130, y: y - 4, size: 8, font: bold, color: navy });
    y -= 33;
  }
  y -= 8;
  ensure(205);
  text("SYNTHESE DU CHIFFRAGE", 12, true);
  const totalRow = (label: string, values: { low: number; mid: number; high: number }) => text(`${label} : bas ${euro(values.low)} | central ${euro(values.mid)} | haut ${euro(values.high)}`, 9, true);
  totalRow("Avant remise", result.subtotal);
  if (quote.discountPercent > 0) {
    totalRow(`Remise commerciale ${quote.discountPercent} %`, result.discount);
    text(`Motif : ${quote.discountReason}`, 9);
  }
  totalRow("Apres remise", result.totals);
  if (quote.basis === "unspecified") { totalRow("Total saisi", result.totals); text("Base HT/TTC a confirmer. Aucune TVA ajoutee ou deduite.", 9); }
  else { totalRow("Total HT", result.ht); totalRow("TVA indicative", result.tax); totalRow("Total TTC", result.ttc); }
  y -= 15;
  text("HYPOTHESES ET CONDITIONS", 11, true);
  text(quote.notes || "Metre et contraintes a confirmer lors de la visite technique.", 9);
  text("Cotation indicative, non contractuelle. Les prix, references, supports et acces doivent etre confirmes lors de la visite technique. Les taux de TVA sont des hypotheses a verifier selon l'eligibilite des travaux. Aucune aide publique n'est deduite.", 9);
  const pages = pdf.getPages();
  pages.forEach((item, index) => {
    item.drawRectangle({ x: 42, y: 56, width: 511, height: 1, color: gold });
    item.drawText(safe(`A2E Renovation | ${phone} | ${quote.number}`), { x: 42, y: 38, size: 8, font: regular, color: navy });
    item.drawText(`${index + 1} / ${pages.length}`, { x: 515, y: 38, size: 8, font: regular, color: navy });
  });
  return pdf.save();
}
