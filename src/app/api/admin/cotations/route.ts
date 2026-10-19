import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin, getRequestActor } from "@/lib/auth/require-admin";
import { calculateQuote, validateQuote } from "@/lib/pricing/quote-workspace";

export const dynamic = "force-dynamic";
const prefix = "quote.";

export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: "Base de donnees non configuree. Le brouillon local reste disponible." }, { status: 503 });
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (id) {
      if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });
      const item = await prisma.pricingSettings.findUnique({ where: { key: prefix + id } });
      if (!item) return NextResponse.json({ error: "Cotation introuvable" }, { status: 404 });
      const quote = validateQuote(item.value);
      return NextResponse.json({ quote, totals: calculateQuote(quote), updatedAt: item.updatedAt });
    }
    const items = await prisma.pricingSettings.findMany({ where: { key: { startsWith: prefix } }, orderBy: { updatedAt: "desc" }, take: 100 });
    const quotes = items.flatMap((item) => {
      try {
        const quote = validateQuote(item.value);
        return [{ id: quote.id, number: quote.number, title: quote.title, client: quote.client, status: quote.status, basis: quote.basis, total: calculateQuote(quote).totals.mid, updatedAt: item.updatedAt }];
      } catch { return []; }
    });
    return NextResponse.json({ quotes });
  } catch { return NextResponse.json({ error: "La base des cotations est indisponible." }, { status: 503 }); }
}

export async function PUT(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: "Base de donnees non configuree. Le brouillon n'est pas enregistre sur le serveur." }, { status: 503 });
  if (Number(request.headers.get("content-length")) > 512_000) return NextResponse.json({ error: "Document trop volumineux" }, { status: 413 });
  let quote;
  try { quote = validateQuote(await request.json()); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Cotation invalide" }, { status: 400 }); }
  try {
    const value = JSON.parse(JSON.stringify(quote));
    const item = await prisma.$transaction(async (tx) => {
      const saved = await tx.pricingSettings.upsert({ where: { key: prefix + quote.id }, update: { value }, create: { key: prefix + quote.id, value } });
      await tx.auditLog.create({ data: { actor: await getRequestActor(request), action: "quote.saved", entity: "PricingSettings", entityId: saved.id, payload: { number: quote.number, lines: quote.lines.length } } });
      return saved;
    });
    return NextResponse.json({ ok: true, quote, totals: calculateQuote(quote), updatedAt: item.updatedAt });
  } catch { return NextResponse.json({ error: "Enregistrement impossible. Le brouillon local est conserve." }, { status: 503 }); }
}
