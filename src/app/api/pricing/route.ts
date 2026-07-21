import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { priceItems } from "@/lib/pricing/price-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  if (!process.env.DATABASE_URL) return NextResponse.json(priceItems);
  const items = await prisma.priceItem.findMany({ where: { active: true }, orderBy: [{ category: "asc" }, { key: "asc" }] }).catch(() => []);
  return NextResponse.json(items.length ? items : priceItems);
}
