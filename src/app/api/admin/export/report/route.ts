import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";
import { exportLeadFilters } from "@/lib/admin/export-filters";
import { leadStatusLabels } from "@/lib/admin/lead-status";

export const dynamic = "force-dynamic";
// Standard PDF fonts support WinAnsi; keep untrusted names printable and bounded.
const safeText = (value: string, max = 75) => value.replace(/[^\x20-\x7e\xa0-\xff]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request); if (denied) return denied;
  const filters = exportLeadFilters(request.nextUrl.searchParams);
  if (!filters.ok) return NextResponse.json({ error: filters.error }, { status: 400 });
  try {
    const leads = await prisma.lead.findMany({ where: filters.where, orderBy: { createdAt: "desc" }, include: { estimates: { orderBy: { createdAt: "desc" }, take: 1 } } });
    const byType = new Map<string, number>();
    for (const lead of leads) byType.set(lead.typeProjet, (byType.get(lead.typeProjet) ?? 0) + 1);
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const navy = rgb(0.078, 0.18, 0.196);
    const page = pdf.addPage([595, 842]);
    page.drawRectangle({ x: 0, y: 742, width: 595, height: 100, color: navy });
    page.drawText("A2E RENOVATION", { x: 42, y: 790, size: 22, font: bold, color: rgb(1, 1, 1) });
    page.drawText(filters.filter.consent === "true" ? "RAPPORT COMMERCIAL - CONTACT ACCEPTE" : "RAPPORT INTERNE - SANS CONSENTEMENT AU CONTACT", { x: 42, y: 765, size: 10, font, color: rgb(0.72, 0.66, 0.54) });
    const dateLabel = filters.filter.from || filters.filter.to ? `${filters.filter.from ?? "Debut de l'historique"} au ${filters.filter.to ?? "Aujourd'hui"}` : "Tout l'historique";
    page.drawText(`Periode : ${dateLabel} / Europe/Paris`, { x: 42, y: 710, size: 10, font, color: navy });
    page.drawText(`Edition : ${new Date().toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })} / Statut : ${filters.filter.status ? safeText(leadStatusLabels[filters.filter.status]) : "Tous"}`, { x: 42, y: 692, size: 9, font, color: navy });
    page.drawText(`Dossiers de la selection : ${leads.length}`, { x: 42, y: 663, size: 15, font: bold, color: navy });
    page.drawText("Repartition par type de projet", { x: 42, y: 628, size: 13, font: bold, color: navy });
    let y = 602;
    const breakdown = [...byType.entries()];
    for (const [type, count] of breakdown.slice(0, 10)) { page.drawText(safeText(type), { x: 55, y, size: 10, font, color: navy }); page.drawText(String(count), { x: 475, y, size: 10, font: bold, color: navy }); y -= 20; }
    if (breakdown.length > 10) { page.drawText(`${breakdown.length - 10} autres types : consulter l'export CSV complet.`, { x: 55, y, size: 9, font, color: navy }); y -= 20; }
    y -= 18;
    page.drawText("Derniers dossiers de la selection (12 maximum)", { x: 42, y, size: 12, font: bold, color: navy }); y -= 24;
    for (const lead of leads.slice(0, 12)) {
      if (y < 80) break;
      page.drawText(safeText(`${lead.name} - ${lead.typeProjet} - ${leadStatusLabels[lead.status]}`, 76), { x: 50, y, size: 8.5, font, color: navy });
      const value = lead.estimates[0]?.mid ?? lead.budget;
      page.drawText(value === null || value === undefined ? "A chiffrer" : `${value} EUR`, { x: 455, y, size: 8.5, font: bold, color: navy }); y -= 17;
    }
    page.drawText("Document interne. Respecter le consentement ; sans accord, aucune relance commerciale.", { x: 42, y: 45, size: 7.5, font, color: rgb(0.2, 0.25, 0.32) });
    const pdfBytes = new Uint8Array(await pdf.save());
    return new Response(new Blob([pdfBytes.buffer], { type: "application/pdf" }), { headers: { "content-type": "application/pdf", "content-disposition": "attachment; filename=a2e-rapport-leads.pdf", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch { return NextResponse.json({ error: "Le rapport est indisponible. Les dossiers n'ont pas pu etre charges ou le PDF genere." }, { status: 503 }); }
}
