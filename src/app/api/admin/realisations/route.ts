import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { realisations as demoRealisations } from "@/lib/site-data";

export async function GET() {
  const items = await prisma.realisation.findMany({ orderBy: { createdAt: "desc" } }).catch(() => []);
  const fallback = demoRealisations.map((item, index) => ({ id: `demo-realisation-${index}`, ...item, active: true }));
  return NextResponse.json({ realisations: fallback.map((item) => items.find((databaseItem) => databaseItem.id === item.id) ?? item).concat(items.filter((item) => !item.id.startsWith("demo-realisation-"))) });
}

export async function PUT(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id : "";
  const source = id.match(/^demo-realisation-(\d+)$/)?.[1];
  const fallback = source && demoRealisations[Number(source)] ? demoRealisations[Number(source)] : demoRealisations[0];
  if (!id || !fallback) return NextResponse.json({ ok: false, error: "Realisation invalide" }, { status: 400 });
  const text = (value: unknown, defaultValue: string, max = 500) => typeof value === "string" && value.trim() ? value.trim().slice(0, max) : defaultValue;
  const tags = Array.isArray(body.tags) ? body.tags.filter((tag: unknown): tag is string => typeof tag === "string").map((tag: string) => tag.trim()).filter(Boolean).slice(0, 8) : fallback.tags;
  const item = await prisma.realisation.upsert({
    where: { id },
    update: { title: text(body.title, fallback.title, 160), city: text(body.city, fallback.city, 120), type: text(body.type, fallback.type, 120), description: text(body.description, fallback.description, 800), duration: text(body.duration, fallback.duration, 80), budget: text(body.budget, fallback.budget, 120), tags, active: body.active !== false },
    create: { id, title: text(body.title, fallback.title, 160), city: text(body.city, fallback.city, 120), type: text(body.type, fallback.type, 120), description: text(body.description, fallback.description, 800), duration: text(body.duration, fallback.duration, 80), budget: text(body.budget, fallback.budget, 120), tags, active: body.active !== false }
  }).catch(() => null);
  if (!item) return NextResponse.json({ ok: false, error: "Enregistrement impossible" }, { status: 503 });
  return NextResponse.json({ ok: true, realisation: item });
}
