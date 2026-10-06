import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";
import { realisations as demoRealisations } from "@/lib/site-data";

export const dynamic = "force-dynamic";
const fields = z.object({
  title: z.string().trim().min(3).max(160), city: z.string().trim().min(2).max(120),
  type: z.string().trim().min(2).max(120), description: z.string().trim().min(10).max(2000),
  duration: z.string().trim().max(80), budget: z.string().trim().max(120),
  tags: z.array(z.string().trim().min(1).max(50)).max(8), active: z.boolean()
});

export async function GET(request: NextRequest) {
  const denied = requireAdmin(request); if (denied) return denied;
  try {
    const items = await prisma.realisation.findMany({ orderBy: { createdAt: "desc" } });
    const fallback = demoRealisations.map((item, index) => ({ id: `demo-realisation-${index}`, ...item, description: `${item.title} - projet de demonstration A2E.`, active: true, isDemo: true }));
    const catalog = [...items.map((item) => ({ ...item, isDemo: item.id.startsWith("demo-realisation-") })), ...fallback.filter((item) => !items.some((saved) => saved.id === item.id))];
    return NextResponse.json({ realisations: catalog }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "La base est indisponible. Impossible de charger les fiches." }, { status: 503 }); }
}

export async function POST(request: NextRequest) {
  const denied = requireAdmin(request); if (denied) return denied;
  const parsed = fields.strict().safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Renseignez un titre, une ville, un type et une description. Verifiez la longueur des champs et des tags." }, { status: 400 });
  try {
    const item = await prisma.$transaction(async (tx) => {
      const created = await tx.realisation.create({ data: parsed.data });
      await tx.auditLog.create({ data: { actor: process.env.ADMIN_EMAIL, action: "realisation.created", entity: "Realisation", entityId: created.id, payload: { title: created.title, active: created.active } } });
      return created;
    });
    return NextResponse.json({ ok: true, realisation: item }, { status: 201 });
  } catch { return NextResponse.json({ error: "Creation impossible. La fiche n'a pas ete enregistree." }, { status: 503 }); }
}

export async function PUT(request: NextRequest) {
  const denied = requireAdmin(request); if (denied) return denied;
  const parsed = fields.extend({ id: z.string().min(1).max(100) }).strict().safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Fiche invalide. Titre, ville, type et description sont obligatoires." }, { status: 400 });
  const { id, ...data } = parsed.data;
  try {
    const item = await prisma.$transaction(async (tx) => {
      const existing = await tx.realisation.findUnique({ where: { id }, select: { id: true } });
      const demoIndex = id.match(/^demo-realisation-(\d+)$/)?.[1];
      if (!existing && (demoIndex === undefined || !demoRealisations[Number(demoIndex)])) return null;
      const saved = await tx.realisation.upsert({ where: { id }, update: data, create: { id, ...data } });
      await tx.auditLog.create({ data: { actor: process.env.ADMIN_EMAIL, action: "realisation.updated", entity: "Realisation", entityId: id, payload: { title: saved.title, active: saved.active } } });
      return saved;
    });
    if (!item) return NextResponse.json({ error: "Fiche introuvable. Utilisez Nouvelle realisation pour creer un projet." }, { status: 404 });
    return NextResponse.json({ ok: true, realisation: item });
  } catch { return NextResponse.json({ error: "Enregistrement impossible. Les modifications n'ont pas ete confirmees." }, { status: 503 }); }
}
