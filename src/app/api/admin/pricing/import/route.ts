import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin, getRequestActor } from "@/lib/auth/require-admin";
import { MAX_CATALOG_BYTES, parseCatalogCsv } from "@/lib/pricing/catalog-transfer";

export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: "Base de donnees non configuree. Import non effectue." }, { status: 503 });
  if (Number(request.headers.get("content-length")) > MAX_CATALOG_BYTES) return NextResponse.json({ error: "Le fichier depasse 500 Ko." }, { status: 413 });
  let items;
  try { items = parseCatalogCsv(await request.text()); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "CSV invalide" }, { status: 400 }); }
  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.priceItem.findMany({ where: { key: { in: items.map((item) => item.key) } }, select: { key: true } });
      const existingKeys = new Set(existing.map((item) => item.key));
      for (const item of items) await tx.priceItem.upsert({ where: { key: item.key }, update: item, create: { ...item, active: true } });
      const created = items.filter((item) => !existingKeys.has(item.key)).length;
      const updated = items.length - created;
      await tx.auditLog.create({ data: { actor: await getRequestActor(request), action: "pricing.imported", entity: "PriceItem", payload: { created, updated, keys: items.map((item) => item.key) } } });
      return { created, updated };
    }, { timeout: 30_000 });
    return NextResponse.json({ ok: true, ...result });
  } catch { return NextResponse.json({ error: "Import annule : la base de prix est indisponible. Aucune ligne importee." }, { status: 503 }); }
}
