import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getSiteContactSettings } from "@/lib/settings/site-contact-settings";
import { siteSettings } from "@/lib/site-data";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage } from "pdf-lib";

export type PdfEstimateLine = {
  label: string; quantity: number; unit: string; low: number; mid: number; high: number;
  reference?: string | null; description?: string | null; vatRate?: number | null;
};
export type EstimatePdfInput = {
  name: string; email?: string; phone?: string; city?: string; number?: string; createdAt?: Date;
  low: number; mid: number; high: number; duration?: string; complexity?: string;
  lines?: PdfEstimateLine[]; assumptions?: string[]; discountPercent?: number; discountDays?: number;
};

const navy = rgb(0.078, 0.18, 0.196);
const ink = navy;
const champagne = rgb(0.635, 0.54, 0.376);
const pearl = rgb(0.96, 0.953, 0.925);
const white = rgb(1, 1, 1);
const euro = (value: number) => `${value.toLocaleString("fr-FR", { maximumFractionDigits: 2 }).replace(/[\u202f\u00a0]/g, " ")} EUR`;

function wrap(value: string, width: number, font: PDFFont, size: number) {
  const lines: string[] = [];
  let current = "";
  const fits = (text: string) => font.widthOfTextAtSize(text, size) <= width;
  for (const word of value.split(/\s+/).filter(Boolean)) {
    if (fits(`${current} ${word}`.trim())) { current = `${current} ${word}`.trim(); continue; }
    if (current) { lines.push(current); current = ""; }
    if (fits(word)) { current = word; continue; }
    for (const character of Array.from(word)) {
      if (current && !fits(current + character)) { lines.push(current); current = ""; }
      current += character;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

export async function generateEstimatePdf(input: EstimatePdfInput) {
  const pdf = await PDFDocument.create();
  const contact = await getSiteContactSettings();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const safe = (value: string) => Array.from(value).map((character) => { try { font.encodeText(character); return character; } catch { return "?"; } }).join("");
  const signatureDiscount = Math.min(15, Math.max(0, input.discountPercent ?? 0)) / 100;
  const discountedMid = Math.round(input.mid * (1 - signatureDiscount) * 100) / 100;
  input = { ...input, name: safe(input.name), number: safe(input.number ?? "A2E-DEMO"), email: input.email ? safe(input.email) : undefined, phone: input.phone ? safe(input.phone) : undefined, city: input.city ? safe(input.city) : undefined, duration: input.duration ? safe(input.duration) : undefined, complexity: input.complexity ? safe(input.complexity) : undefined, lines: input.lines?.map((line) => ({ ...line, label: safe(line.label), unit: safe(line.unit), description: line.description ? safe(line.description) : undefined, reference: line.reference ? safe(line.reference) : undefined })), assumptions: input.assumptions?.map(safe) };
  pdf.setTitle(`A2E - ${input.number}`);
  pdf.setAuthor("A2E Renovation");
  let logo: PDFImage | undefined;
  try { logo = await pdf.embedJpg(await readFile(join(process.cwd(), "public", "branding", "a2e-logo.jpeg"))); } catch { /* Text branding remains available. */ }
  let page = pdf.addPage([595, 842]);
  let y = 721;

  const drawRight = (value: string, right: number, baseline: number, width: number, desiredSize: number, weight = font, color = ink) => {
    const measured = weight.widthOfTextAtSize(value, desiredSize);
    const size = measured > width ? desiredSize * width / measured : desiredSize;
    page.drawText(value, { x: right - weight.widthOfTextAtSize(value, size), y: baseline, size, font: weight, color });
  };
  const header = () => {
    page.drawRectangle({ x: 0, y: 750, width: 595, height: 92, color: navy });
    if (logo) page.drawImage(logo, { x: 42, y: 766, width: 92, height: 58 });
    page.drawText("A2E RENOVATION", { x: logo ? 148 : 42, y: 802, size: 20, font: bold, color: white });
    page.drawText("PRE-DEVIS INDICATIF", { x: logo ? 148 : 42, y: 777, size: 10, font, color: champagne });
    const documentLines = wrap(`Document ${input.number}`, 148, font, 8);
    documentLines.forEach((line, index) => drawRight(line, 553, 805 - index * 12, 148, 8, font, white));
    y = 721;
  };
  const ensure = (height: number) => {
    if (y - height >= 78) return false;
    page = pdf.addPage([595, 842]); header(); return true;
  };
  const block = (value: string, size = 9, weight = font, width = 511, x = 42, color = ink) => {
    for (const line of wrap(value, width, weight, size)) {
      ensure(size + 5);
      page.drawText(line, { x, y, size, font: weight, color });
      y -= size + 5;
    }
  };
  const tableHeader = () => {
    ensure(38);
    page.drawRectangle({ x: 42, y: y - 20, width: 511, height: 24, color: navy });
    page.drawText("Poste et contenu", { x: 50, y: y - 13, size: 8.5, font: bold, color: white });
    page.drawText("Qte", { x: 290, y: y - 13, size: 8.5, font: bold, color: white });
    drawRight("Bas", 400, y - 13, 61, 8.5, bold, white);
    drawRight("Central", 473, y - 13, 65, 8.5, bold, white);
    drawRight("Haut", 546, y - 13, 66, 8.5, bold, white);
    y -= 38;
  };
  header();
  block(`Client : ${input.name}`, 12, bold);
  y -= 5;
  block(`Date : ${(input.createdAt ?? new Date()).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })} | Validite indicative : 30 jours`, 9);
  for (const line of [input.email && `Email : ${input.email}`, input.phone && `Telephone : ${input.phone}`, input.city && `Zone : ${input.city}`].filter((line): line is string => Boolean(line))) { block(line, 9); y -= 3; }
  y -= 15;

  const budgetNotes = wrap("Montants indicatifs avant metre, validation technique et choix definitif des references. TVA a confirmer, aides non deduites.", 471, font, 8);
  const discountNotes = signatureDiscount > 0 ? wrap(`Remise envisageable : ${signatureDiscount * 100} % sous ${input.discountDays ?? 15} jours, a confirmer sur devis. Projection centrale : ${euro(discountedMid)}. Le prix de reference reste celui du catalogue.`, 471, bold, 8) : [];
  const budgetHeight = 98 + (budgetNotes.length + discountNotes.length) * 12;
  ensure(budgetHeight + 20);
  const budgetTop = y + 8;
  page.drawRectangle({ x: 42, y: budgetTop - budgetHeight, width: 511, height: budgetHeight, color: pearl });
  page.drawText("VOTRE FOURCHETTE DE BUDGET", { x: 62, y: budgetTop - 21, size: 11, font: bold, color: champagne });
  (["low", "mid", "high"] as const).forEach((scenario, index) => {
    const x = 62 + index * 160;
    page.drawText(["Bas", "Central", "Haut"][index], { x, y: budgetTop - 43, size: 9, font, color: ink });
    drawRight(euro(input[scenario]), x + 146, budgetTop - 65, 146, scenario === "mid" ? 17 : 15, scenario === "mid" ? bold : font);
  });
  [...budgetNotes, ...discountNotes].forEach((line, index) => page.drawText(line, { x: 62, y: budgetTop - 87 - index * 12, size: 8, font: index < budgetNotes.length ? font : bold, color: ink }));
  y = budgetTop - budgetHeight - 26;
  block("DETAIL DU PROJET", 13, bold);
  y -= 8;
  tableHeader();

  for (const line of input.lines ?? []) {
    const detail = [line.description && `Contenu : ${line.description}`, line.reference && `Reference indicative : ${line.reference}`, line.vatRate && `TVA indicative : ${line.vatRate} %`].filter(Boolean).join(" | ");
    const labelLines = wrap(line.label, 229, bold, 8.5);
    const detailLines = detail ? wrap(detail, 229, font, 7.8) : [];
    const rowHeight = Math.max(35, labelLines.length * 12 + detailLines.length * 11 + 14);
    if (ensure(rowHeight + 10)) tableHeader();
    page.drawRectangle({ x: 42, y: y - rowHeight + 8, width: 511, height: rowHeight, color: pearl });
    labelLines.forEach((value, index) => page.drawText(value, { x: 50, y: y - index * 12, size: 8.5, font: bold, color: ink }));
    detailLines.forEach((value, index) => page.drawText(value, { x: 50, y: y - labelLines.length * 12 - index * 11 - 2, size: 7.8, font, color: ink }));
    drawRight(`${line.quantity.toLocaleString("fr-FR", { maximumFractionDigits: 4 }).replace(/[\u202f\u00a0]/g, " ")} ${line.unit}`, 337, y, 47, 8);
    drawRight(euro(line.low), 400, y, 61, 7.8);
    drawRight(euro(line.mid), 473, y, 65, 7.8, bold);
    drawRight(euro(line.high), 546, y, 66, 7.8);
    y -= rowHeight + 5;
  }
  y -= 15;
  ensure(75);
  block(`Duree previsionnelle : ${input.duration ?? "A confirmer"}`, 10, bold);
  block(`Complexite estimee : ${input.complexity ?? "A confirmer"}`, 10);
  y -= 10;
  ensure(110);
  block("FEUILLE DE ROUTE", 12, bold);
  for (const [index, step] of ["Validation du metre et des supports", "Choix des materiels ou equivalents", "Devis final et planning d'intervention", "Realisation, controle et reception"].entries()) block(`0${index + 1} / ${step}`, 9);
  y -= 12;
  ensure(55);
  block("HYPOTHESES ET RESERVES", 12, bold);
  for (const note of input.assumptions ?? []) { block(`- ${note}`, 8.5); y -= 5; }
  y -= 6;
  block("Ce document est un pre-devis indicatif et non un devis contractuel. Le montant definitif depend du releve sur place, de l'etat des supports, des acces, des references choisies et des contraintes reglementaires.", 8.5);

  const pages = pdf.getPages();
  pages.forEach((item, index) => {
    page = item;
    page.drawRectangle({ x: 42, y: 50, width: 511, height: 1, color: champagne });
    const footer = safe(`A2E Renovation | ${contact.phone} | ${siteSettings.email}`);
    drawRight(footer, 492, 33, 450, 8);
    drawRight(`${index + 1} / ${pages.length}`, 553, 33, 48, 8);
  });
  return pdf.save();
}
