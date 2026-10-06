import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";
import { exportLeadFilters } from "@/lib/admin/export-filters";
import { csvCell } from "@/lib/pricing/catalog-transfer";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const denied = requireAdmin(request); if (denied) return denied;
  const filters = exportLeadFilters(request.nextUrl.searchParams);
  if (!filters.ok) return NextResponse.json({ error: filters.error }, { status: 400 });
  try {
    const leads = await prisma.lead.findMany({ where: filters.where, orderBy: { createdAt: "desc" }, include: { estimates: { orderBy: { createdAt: "desc" }, take: 1 } } });
    const rows = [
      ["Date", "Nom", "Email", "Telephone", "Zone", "Projet", "Statut", "Consentement", "Bas", "Central", "Haut"],
      ...leads.map((lead) => [lead.createdAt.toISOString(), lead.name, lead.email, lead.phone, lead.city, lead.typeProjet, lead.status, lead.consent ? "oui" : "non", lead.estimates[0]?.low ?? "", lead.estimates[0]?.mid ?? lead.budget ?? "", lead.estimates[0]?.high ?? ""])
    ];
    return new Response(`\uFEFF${rows.map((row) => row.map(csvCell).join(";")).join("\r\n")}`, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": "attachment; filename=a2e-leads.csv", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch { return NextResponse.json({ error: "L'export est indisponible. Les dossiers n'ont pas pu etre charges." }, { status: 503 }); }
}
