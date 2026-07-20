import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { priceItems } from "@/lib/pricing/price-data";

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const key = typeof body.key === "string" ? body.key : "";
  const low = Number(body.low);
  const mid = Number(body.mid);
  const high = Number(body.high);
  if (!key || ![low, mid, high].every(Number.isFinite) || low < 0 || low > mid || mid > high) return NextResponse.json({ ok: false, error: "Bornes de prix invalides" }, { status: 400 });
  const source = priceItems.find((entry) => entry.key === key);
  const item = await prisma.priceItem.upsert({
    where: { key },
    update: { low: Math.round(low), mid: Math.round(mid), high: Math.round(high) },
    create: { key, category: source?.category ?? "other", label: source?.label ?? key, unit: source?.unit ?? "forfait", low: Math.round(low), mid: Math.round(mid), high: Math.round(high), active: true }
  }).catch(() => null);
  if (!item) return NextResponse.json({ ok: false, error: "Base de prix indisponible" }, { status: 503 });
  return NextResponse.json({ ok: true, item });
}
