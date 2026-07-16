import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

export type PdfEstimateLine = { label: string; quantity: number; unit: string; low: number; mid: number; high: number; reference?: string | null; description?: string | null };
export type EstimatePdfInput = {
  name: string;
  email?: string;
  phone?: string;
  city?: string;
  number?: string;
  createdAt?: Date;
  low: number;
  mid: number;
  high: number;
  duration?: string;
  complexity?: string;
  lines?: PdfEstimateLine[];
  assumptions?: string[];
};

const navy = rgb(0.027, 0.102, 0.216);
const ink = rgb(0.08, 0.14, 0.25);
const champagne = rgb(0.72, 0.66, 0.54);
const pearl = rgb(0.98, 0.97, 0.94);
const euro = (value: number) => `${value.toLocaleString("fr-FR").replace(/[\u202f\u00a0]/g, " ")} EUR`;
const wrap = (value: string, max = 88) => { const words = value.split(/\s+/); const lines: string[] = []; let current = ""; for (const word of words) { if ((current + " " + word).trim().length > max) { if (current) lines.push(current); current = word; } else current = `${current} ${word}`.trim(); } if (current) lines.push(current); return lines; };

function drawWrapped(page: PDFPage, text: string, x: number, y: number, width: number, font: PDFFont, size: number, color = ink) {
  const max = Math.max(20, Math.floor(width / (size * 0.52)));
  const lines = wrap(text, max);
  lines.forEach((line, index) => page.drawText(line, { x, y: y - index * (size + 4), size, font, color }));
  return y - lines.length * (size + 4);
}

export async function generateEstimatePdf(input: EstimatePdfInput) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([595, 842]);
  let y = 790;
  const addPageIfNeeded = (height = 60) => { if (y < height) { page = pdf.addPage([595, 842]); y = 790; } };

  try {
    const logo = await pdf.embedJpg(await readFile(join(process.cwd(), "public", "branding", "a2e-logo.jpeg")));
    page.drawImage(logo, { x: 42, y: 752, width: 92, height: 58 });
  } catch { /* The PDF remains usable if the optional logo asset is unavailable. */ }
  page.drawRectangle({ x: 0, y: 742, width: 595, height: 100, color: navy });
  page.drawText("A2E RENOVATION", { x: 155, y: 795, size: 22, font: bold, color: rgb(1, 1, 1) });
  page.drawText("PRE-DEVIS INDICATIF - CONFIGURATION TRAVAUX", { x: 155, y: 768, size: 10, font, color: champagne });
  page.drawText(`Document ${input.number ?? "A2E-DEMO"}`, { x: 400, y: 795, size: 9, font, color: rgb(1, 1, 1) });
  y = 705;

  page.drawText(`Client : ${input.name}`, { x: 42, y, size: 13, font: bold, color: navy });
  page.drawText(`Date : ${(input.createdAt ?? new Date()).toLocaleDateString("fr-FR")}`, { x: 42, y: y - 21, size: 10, font, color: ink });
  page.drawText("Validité indicative : 30 jours", { x: 350, y: y - 21, size: 10, font, color: ink });
  if (input.email) page.drawText(`Email : ${input.email}`, { x: 42, y: y - 40, size: 10, font, color: ink });
  if (input.phone) page.drawText(`Téléphone : ${input.phone}`, { x: 300, y: y - 40, size: 10, font, color: ink });
  if (input.city) page.drawText(`Ville : ${input.city}`, { x: 42, y: y - 59, size: 10, font, color: ink });
  y -= 92;

  page.drawRectangle({ x: 42, y: y - 75, width: 511, height: 95, color: pearl });
  page.drawText("VOTRE FOURCHETTE DE BUDGET", { x: 62, y: y - 5, size: 11, font: bold, color: champagne });
  page.drawText(`Bas ${euro(input.low)}`, { x: 62, y: y - 38, size: 12, font, color: navy });
  page.drawText(`Central ${euro(input.mid)}`, { x: 230, y: y - 38, size: 14, font: bold, color: navy });
  page.drawText(`Haut ${euro(input.high)}`, { x: 420, y: y - 38, size: 12, font, color: navy });
  page.drawText("Montants indicatifs avant métré, validation technique et choix définitif des références.", { x: 62, y: y - 61, size: 8, font, color: ink });
  y -= 115;

  page.drawText("DÉTAIL DU PROJET", { x: 42, y, size: 15, font: bold, color: navy });
  y -= 23;
  page.drawRectangle({ x: 42, y: y - 20, width: 511, height: 22, color: navy });
  page.drawText("Désignation", { x: 50, y: y - 14, size: 9, font: bold, color: rgb(1, 1, 1) });
  page.drawText("Qté", { x: 350, y: y - 14, size: 9, font: bold, color: rgb(1, 1, 1) });
  page.drawText("Central", { x: 445, y: y - 14, size: 9, font: bold, color: rgb(1, 1, 1) });
  y -= 38;
  for (const line of input.lines ?? []) {
    addPageIfNeeded(100);
    const labelLines = wrap(line.label, 57);
    const rowHeight = Math.max(22, labelLines.length * 12 + 8);
    page.drawRectangle({ x: 42, y: y - rowHeight + 7, width: 511, height: rowHeight, color: pearl });
    labelLines.forEach((label, index) => page.drawText(label, { x: 50, y: y - index * 12, size: 8.5, font, color: ink }));
    if (line.reference) page.drawText(`Réf. indicative : ${line.reference}`, { x: 50, y: y - labelLines.length * 12, size: 7.5, font, color: champagne });
    page.drawText(`${line.quantity} ${line.unit}`, { x: 350, y, size: 8.5, font, color: ink });
    page.drawText(euro(line.mid), { x: 445, y, size: 8.5, font: bold, color: navy });
    y -= rowHeight + 4;
  }
  y -= 12;
  addPageIfNeeded(150);
  page.drawText(`Durée prévisionnelle : ${input.duration ?? "À confirmer"}`, { x: 42, y, size: 10, font: bold, color: navy });
  page.drawText(`Complexité estimée : ${input.complexity ?? "À confirmer"}`, { x: 300, y, size: 10, font, color: ink });
  y -= 28;
  page.drawText("FEUILLE DE ROUTE", { x: 42, y, size: 13, font: bold, color: navy });
  y -= 19;
  ["Validation du métré et des supports", "Choix des matériels ou équivalents", "Devis final et planning d'intervention", "Réalisation, contrôle et réception"].forEach((step, index) => { page.drawText(`0${index + 1}`, { x: 44, y, size: 9, font: bold, color: champagne }); page.drawText(step, { x: 70, y, size: 9, font, color: ink }); y -= 17; });
  y -= 10;
  addPageIfNeeded(180);
  page.drawText("HYPOTHÈSES ET RÉSERVES", { x: 42, y, size: 13, font: bold, color: navy });
  y -= 19;
  for (const note of input.assumptions ?? []) { y = drawWrapped(page, `- ${note}`, 42, y, 510, font, 8.5) - 5; addPageIfNeeded(130); }
  y -= 6;
  drawWrapped(page, "Ce document est un pré-devis indicatif et non un devis contractuel. Le montant définitif dépend du relevé sur place, de l'état des supports, des accès, des références choisies et des contraintes réglementaires.", 42, y, 510, font, 8.5);
  page.drawRectangle({ x: 42, y: 48, width: 511, height: 3, color: champagne });
  page.drawText("A2E Rénovation - 01 89 40 00 20 - contact@ags-a2e.com", { x: 42, y: 32, size: 8, font, color: ink });
  return pdf.save();
}
