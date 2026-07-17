import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";

function filters(request: NextRequest) {
  const search = request.nextUrl.searchParams;
  const where: Record<string, unknown> = {};
  if (search.get("consent") === "true") where.consent = true;
  if (search.get("type")) where.typeProjet = search.get("type");
  if (search.get("status")) where.status = search.get("status");
  if (search.get("from") || search.get("to")) where.createdAt = { ...(search.get("from") ? { gte: new Date(`${search.get("from")}T00:00:00`) } : {}), ...(search.get("to") ? { lte: new Date(`${search.get("to")}T23:59:59`) } : {}) };
  return where;
}

const csv = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;

export async function GET(request: NextRequest) {
  const leads = await prisma.lead.findMany({ where: filters(request), orderBy: { createdAt: "desc" }, include: { estimates: { orderBy: { createdAt: "desc" }, take: 1 } } });
  const rows = [
    ["Date", "Nom", "Email", "Telephone", "Zone", "Projet", "Statut", "Consentement", "Bas", "Central", "Haut"],
    ...leads.map((lead) => [lead.createdAt.toISOString(), lead.name, lead.email, lead.phone, lead.city, lead.typeProjet, lead.status, lead.consent ? "oui" : "non", lead.estimates[0]?.low ?? "", lead.estimates[0]?.mid ?? lead.budget ?? "", lead.estimates[0]?.high ?? ""])
  ];
  return new Response(`\uFEFF${rows.map((row) => row.map(csv).join(";")).join("\n")}`, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": "attachment; filename=a2e-leads.csv" } });
}
