import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { priceItems } from "@/lib/pricing/price-data";

export const dynamic = "force-dynamic";

const categories = new Set(["windows", "insulation", "electricity", "plumbing", "global", "hvac", "kitchen_bath", "roofing", "other"]);
const units = new Set(["unit", "m2", "forfait", "point"]);

function values(body: Record<string, unknown>) {
  const key = typeof body.key === "string" ? body.key.trim().slice(0, 80) : "";
  const label = typeof body.label === "string" ? body.label.trim().slice(0, 160) : key;
  const category = typeof body.category === "string" && categories.has(body.category) ? body.category : "other";
  const unit = typeof body.unit === "string" && units.has(body.unit) ? body.unit : "forfait";
  const low = Number(body.low);
  const mid = Number(body.mid);
  const high = Number(body.high);
  const vatRate = Number(body.vatRate);
  return { key, label, category, unit, low, mid, high, vatRate: [5.5, 10, 20].includes(vatRate) ? vatRate : 10, reference: typeof body.reference === "string" ? body.reference.trim().slice(0, 160) : undefined, description: typeof body.description === "string" ? body.description.trim().slice(0, 500) : undefined };
}

export async function PUT(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { key, label, category, unit, low, mid, high, vatRate, reference, description } = values(body);
  if (!key || ![low, mid, high].every(Number.isFinite) || low < 0 || low > mid || mid > high) return NextResponse.json({ ok: false, error: "Bornes de prix invalides" }, { status: 400 });
  const source = priceItems.find((entry) => entry.key === key);
  const item = await prisma.priceItem.upsert({
    where: { key },
    update: { label, category, unit, low: Math.round(low), mid: Math.round(mid), high: Math.round(high), vatRate, ...(reference !== undefined ? { reference } : {}), ...(description !== undefined ? { description } : {}) },
    create: { key, category: source?.category ?? category, label: source?.label ?? label, unit: source?.unit ?? unit, low: Math.round(low), mid: Math.round(mid), high: Math.round(high), vatRate: source?.vatRate ?? vatRate, reference: source?.reference ?? reference, description: source?.description ?? description, active: true }
  }).catch(() => null);
  if (!item) return NextResponse.json({ ok: false, error: "Base de prix indisponible" }, { status: 503 });
  return NextResponse.json({ ok: true, item });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { key, label, category, unit, low, mid, high, vatRate, reference, description } = values(body);
  if (!key || !label || ![low, mid, high].every(Number.isFinite) || low < 0 || low > mid || mid > high) return NextResponse.json({ ok: false, error: "Ligne tarifaire invalide" }, { status: 400 });
  const item = await prisma.priceItem.create({ data: { key, label, category, unit, low: Math.round(low), mid: Math.round(mid), high: Math.round(high), vatRate, reference, description, active: true } }).catch(() => null);
  if (!item) return NextResponse.json({ ok: false, error: "La clé existe déjà ou la base est indisponible" }, { status: 409 });
  await prisma.auditLog.create({ data: { actor: "admin", action: "pricing.created", entity: "PriceItem", entityId: item.id, payload: { key, label } } }).catch(() => undefined);
  return NextResponse.json({ ok: true, item }, { status: 201 });
}
