import { prisma } from "@/lib/db/prisma";
import { priceItems, type PriceItem } from "./price-data";
export async function getPricingCatalog(): Promise<PriceItem[]> {
  if (!process.env.DATABASE_URL) return priceItems;
  const rows = await prisma.priceItem.findMany({ where: { active: true }, orderBy: [{ category: "asc" }, { key: "asc" }] });
  if (!rows.length) throw new Error("Le catalogue doit etre initialise avant le chiffrage.");
  return rows.map(row => ({ ...row, category: row.category as PriceItem["category"], unit: row.unit as PriceItem["unit"], reference: row.reference ?? undefined, description: row.description ?? undefined }));
}
