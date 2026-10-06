import { NextResponse } from "next/server";
import { getPricingCatalog } from "@/lib/pricing/catalog";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export async function GET() {
  try { return NextResponse.json(await getPricingCatalog(), { headers: { "x-pricing-source": process.env.DATABASE_URL ? "database" : "demonstration", "cache-control": "no-store" } }); }
  catch { return NextResponse.json({ error: "Catalogue indisponible. Reessayez ou contactez A2E." }, { status: 503 }); }
}
