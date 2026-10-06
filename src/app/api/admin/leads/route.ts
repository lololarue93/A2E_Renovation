import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";
import { leadStatuses } from "@/lib/admin/lead-status";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  id: z.string().min(1).max(100),
  status: z.enum(leadStatuses),
  previousStatus: z.enum(leadStatuses),
  note: z.string().trim().max(2000).optional()
}).strict();

export async function GET(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const search = (request.nextUrl.searchParams.get("search") ?? "").trim().slice(0, 100);
  const status = request.nextUrl.searchParams.get("status");
  if (status && !leadStatuses.includes(status as typeof leadStatuses[number])) {
    return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
  }
  const rawPage = Number(request.nextUrl.searchParams.get("page") ?? 1);
  const page = Number.isInteger(rawPage) && rawPage > 0 ? Math.min(rawPage, 10000) : 1;
  const consent = request.nextUrl.searchParams.get("consent") ?? "yes";
  const id = request.nextUrl.searchParams.get("id");
  const where: Prisma.LeadWhereInput = {
    ...(id ? { id: id.slice(0, 100) } : {}),
    ...(status ? { status: status as typeof leadStatuses[number] } : {}),
    ...(consent === "all" ? {} : { consent: consent !== "no" }),
    ...(search ? { OR: ["name", "email", "phone", "city", "typeProjet"].map((field) => ({ [field]: { contains: search, mode: "insensitive" } })) } : {})
  };
  try {
    const [leads, total] = await prisma.$transaction([
      prisma.lead.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * 20, take: 20, include: {
        project: { select: { type: true, city: true, postalCode: true, surface: true, details: true } },
        estimates: { orderBy: { createdAt: "desc" }, take: 1, include: { lines: true } }
      } }),
      prisma.lead.count({ where })
    ]);
    const notes = leads.length ? await prisma.auditLog.findMany({
      where: { entity: "Lead", entityId: { in: leads.map((lead) => lead.id) }, action: "lead.note_added" },
      orderBy: { createdAt: "desc" }, take: 200,
      select: { id: true, entityId: true, payload: true, createdAt: true }
    }) : [];
    return NextResponse.json({ leads: leads.map((lead) => ({ ...lead, notes: notes.filter((note) => note.entityId === lead.id).map((note) => ({
      id: note.id, createdAt: note.createdAt, text: note.payload && typeof note.payload === "object" && !Array.isArray(note.payload) && typeof note.payload.note === "string" ? note.payload.note : ""
    })) })), total, page, pageSize: 20 }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "La base de donnees est indisponible. Les dossiers ne peuvent pas etre charges." }, { status: 503 });
  }
}

export async function PATCH(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Statut ou note invalide (2000 caracteres maximum)." }, { status: 400 });
  const { id, status, previousStatus, note } = parsed.data;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.lead.findUnique({ where: { id }, select: { status: true } });
      if (!current) return "missing" as const;
      const updated = await tx.lead.updateMany({ where: { id, status: previousStatus }, data: { status } });
      if (!updated.count) return "conflict" as const;
      if (status !== previousStatus) await tx.auditLog.create({ data: {
        actor: process.env.ADMIN_EMAIL, action: "lead.status_updated", entity: "Lead", entityId: id,
        payload: { previousStatus, status }
      } });
      if (note) await tx.auditLog.create({ data: {
        actor: process.env.ADMIN_EMAIL, action: "lead.note_added", entity: "Lead", entityId: id, payload: { note }
      } });
      return "saved" as const;
    });
    if (result === "missing") return NextResponse.json({ error: "Dossier introuvable" }, { status: 404 });
    if (result === "conflict") return NextResponse.json({ error: "Le statut a change depuis l'ouverture du dossier. Rechargez avant de modifier." }, { status: 409 });
    return NextResponse.json({ ok: true, id, status });
  } catch {
    return NextResponse.json({ error: "Enregistrement impossible. Le statut et la note n'ont pas ete confirmes." }, { status: 503 });
  }
}
