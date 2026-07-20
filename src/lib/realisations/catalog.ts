import { prisma } from "@/lib/db/prisma";
import { realisations as demoRealisations } from "@/lib/site-data";

export async function getPublicRealisations() {
  const databaseItems = await prisma.realisation.findMany({ where: { active: true }, orderBy: { createdAt: "desc" } }).catch(() => []);
  const fallback = demoRealisations.map((item, index) => ({ id: `demo-realisation-${index}`, ...item, description: `${item.title} - projet de demonstration A2E.`, active: true }));
  return fallback.map((item) => databaseItems.find((databaseItem) => databaseItem.id === item.id) ?? item).concat(databaseItems.filter((item) => !item.id.startsWith("demo-realisation-")));
}
