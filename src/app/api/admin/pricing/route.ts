import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const key = typeof body.key === "string" ? body.key : "";
  const low = Number(body.low);
  const mid = Number(body.mid);
  const high = Number(body.high);
  if (!key || ![low, mid, high].every(Number.isFinite) || low < 0 || low > mid || mid > high) return NextResponse.json({ ok: false, error: "Bornes de prix invalides" }, { status: 400 });
  const item = await prisma.priceItem.update({ where: { key }, data: { low: Math.round(low), mid: Math.round(mid), high: Math.round(high) } }).catch(() => null);
  if (!item) return NextResponse.json({ ok: false, error: "Base de prix indisponible" }, { status: 503 });
  return NextResponse.json({ ok: true, item });
}
