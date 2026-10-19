import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin, getRequestActor } from "@/lib/auth/require-admin";
import { validatePriceItem } from "@/lib/pricing/catalog-transfer";
import { priceItems } from "@/lib/pricing/price-data";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  if (!process.env.DATABASE_URL) return NextResponse.json({ items: priceItems, source: "demo" });
  try {
    const items = await prisma.priceItem.findMany({ where: { active: true }, orderBy: [{ category: "asc" }, { key: "asc" }] });
    return NextResponse.json({ items, source: "database" });
  } catch { return NextResponse.json({ error: "Base de prix indisponible. Reessayez avant de modifier le catalogue." }, { status: 503 }); }
}

async function save(request: NextRequest, create: boolean) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: "Base de donnees non configuree. Aucun tarif n'a ete modifie." }, { status: 503 });
  let data;
  try { data = validatePriceItem(await request.json()); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Ligne invalide" }, { status: 400 }); }
  try {
    const item = await prisma.$transaction(async (tx) => {
      const result = create ? await tx.priceItem.create({ data: { ...data, active: true } }) : await tx.priceItem.upsert({ where: { key: data.key }, update: data, create: { ...data, active: true } });
      await tx.auditLog.create({ data: { actor: await getRequestActor(request), action: create ? "pricing.created" : "pricing.updated", entity: "PriceItem", entityId: result.id, payload: { key: result.key, label: result.label } } });
      return result;
    });
    return NextResponse.json({ ok: true, item }, { status: create ? 201 : 200 });
  } catch (error) {
    const conflict = typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
    return NextResponse.json({ error: conflict ? "Cette cle existe deja. Modifiez la ligne existante." : "Base de prix indisponible. Aucun tarif n'a ete modifie." }, { status: conflict ? 409 : 503 });
  }
}
export const PUT = (request: NextRequest) => save(request, false);
export const POST = (request: NextRequest) => save(request, true);
