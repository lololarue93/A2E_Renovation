import { NextRequest } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams;
  const leads = await prisma.lead.findMany({ where: { consent: search.get("consent") !== "false", ...(search.get("type") ? { typeProjet: search.get("type")! } : {}), ...(search.get("status") ? { status: search.get("status") as never } : {}) }, orderBy: { createdAt: "desc" }, include: { estimates: { orderBy: { createdAt: "desc" }, take: 1 } } });
  const byType = new Map<string, number>();
  for (const lead of leads) byType.set(lead.typeProjet, (byType.get(lead.typeProjet) ?? 0) + 1);
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const navy = rgb(0.027, 0.102, 0.216);
  page.drawRectangle({ x: 0, y: 742, width: 595, height: 100, color: navy });
  page.drawText("A2E RENOVATION", { x: 42, y: 790, size: 22, font: bold, color: rgb(1, 1, 1) });
  page.drawText("RAPPORT COMMERCIAL - LEADS CONSENTIS", { x: 42, y: 765, size: 10, font, color: rgb(0.72, 0.66, 0.54) });
  page.drawText(`Periode : ${new Date().toLocaleDateString("fr-FR")}`, { x: 42, y: 710, size: 10, font, color: navy });
  page.drawText(`Leads exploitables : ${leads.length}`, { x: 42, y: 682, size: 15, font: bold, color: navy });
  page.drawText("Repartition par type de projet", { x: 42, y: 642, size: 13, font: bold, color: navy });
  let y = 616;
  for (const [type, count] of byType) { page.drawText(type, { x: 55, y, size: 10, font, color: navy }); page.drawText(String(count), { x: 420, y, size: 10, font: bold, color: navy }); y -= 20; }
  y -= 20;
  page.drawText("Derniers contacts acceptes", { x: 42, y, size: 13, font: bold, color: navy });
  y -= 24;
  for (const lead of leads.slice(0, 12)) { if (y < 80) break; page.drawText(`${lead.name} - ${lead.typeProjet} - ${lead.status}`, { x: 50, y, size: 8.5, font, color: navy }); page.drawText(`${lead.estimates[0]?.mid ?? lead.budget ?? 0} EUR`, { x: 430, y, size: 8.5, font: bold, color: navy }); y -= 17; }
  page.drawText("Document interne - utiliser les donnees uniquement dans le cadre du consentement recueilli.", { x: 42, y: 45, size: 7.5, font, color: rgb(0.2, 0.25, 0.32) });
  const bytes = await pdf.save();
  const body = new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" });
  return new Response(body, { headers: { "content-type": "application/pdf", "content-disposition": "attachment; filename=a2e-rapport-leads.pdf" } });
}
