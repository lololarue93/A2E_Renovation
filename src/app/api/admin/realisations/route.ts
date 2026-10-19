import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin, getRequestActor } from "@/lib/auth/require-admin";
import { gallerySettingsKey } from "@/lib/realisations/gallery";

export const dynamic = "force-dynamic";
const fields = z.object({
  title: z.string().trim().min(3).max(160), city: z.string().trim().min(2).max(120),
  type: z.string().trim().min(2).max(120), description: z.string().trim().min(10).max(2000),
  duration: z.string().trim().max(80), budget: z.string().trim().max(120),
  tags: z.array(z.string().trim().min(1).max(50)).max(8), active: z.boolean()
});

export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request); if (denied) return denied;
  try {
    const [items, settings] = await Promise.all([
      prisma.realisation.findMany({ orderBy: { createdAt: "desc" }, include: { media: { orderBy: { createdAt: "asc" } }, photos: { orderBy: { sortOrder: "asc" } } } }),
      prisma.siteSettings.findMany({ where: { key: { startsWith: "gallery:" } } })
    ]);
    return NextResponse.json({ realisations: items.map(item => ({ ...item, isDemo: item.id.startsWith("demo-realisation-"), galleryManifest: settings.find(row => row.key === gallerySettingsKey(item.id))?.value })) }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "La base est indisponible. Impossible de charger les fiches." }, { status: 503 }); }
}

export async function POST(request: NextRequest) {
  const denied = await requireAdmin(request); if (denied) return denied;
  const parsed = fields.strict().safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Renseignez un titre, une ville, un type et une description. Vérifiez la longueur des champs et des tags." }, { status: 400 });
  if (parsed.data.active) return NextResponse.json({ error: "Créez d'abord la fiche en brouillon, puis ajoutez une photo avant de publier." }, { status: 400 });
  try {
    const item = await prisma.$transaction(async tx => {
      const created = await tx.realisation.create({ data: parsed.data });
      await tx.auditLog.create({ data: { actor: await getRequestActor(request), action: "realisation.created", entity: "Realisation", entityId: created.id, payload: { title: created.title, active: false } } });
      return created;
    });
    return NextResponse.json({ ok: true, realisation: item }, { status: 201 });
  } catch { return NextResponse.json({ error: "Création impossible. La fiche n'a pas été enregistrée." }, { status: 503 }); }
}

export async function PUT(request: NextRequest) {
  const denied = await requireAdmin(request); if (denied) return denied;
  const parsed = fields.extend({ id: z.string().min(1).max(100) }).strict().safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Fiche invalide. Titre, ville, type et description sont obligatoires." }, { status: 400 });
  const { id, ...data } = parsed.data;
  try {
    const result = await prisma.$transaction(async tx => {
      const existing = await tx.realisation.findUnique({ where: { id }, select: { id: true } });
      if (!existing) return { error: "Fiche introuvable. Créez un projet pour commencer.", status: 404 };
      if (data.active) {
        const [media, photo] = await Promise.all([
          tx.mediaAsset.findFirst({ where: { realisationId: id, kind: "image" } }),
          tx.realisationPhoto.findFirst({ where: { realisationId: id, OR: [{ beforeUrl: { not: null } }, { afterUrl: { not: null } }] } })
        ]);
        if (!media && !photo) return { error: "Ajoutez au moins une photo avant de publier cette réalisation.", status: 400 };
      }
      const saved = await tx.realisation.update({ where: { id }, data });
      await tx.auditLog.create({ data: { actor: await getRequestActor(request), action: "realisation.updated", entity: "Realisation", entityId: id, payload: { title: saved.title, active: saved.active } } });
      return { item: saved };
    }, { isolationLevel: "Serializable" });
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ ok: true, realisation: result.item });
  } catch { return NextResponse.json({ error: "Enregistrement impossible. Les modifications n'ont pas été confirmées." }, { status: 503 }); }
}
