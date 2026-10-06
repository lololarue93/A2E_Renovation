import { prisma } from "@/lib/db/prisma";
import { unstable_noStore as noStore } from "next/cache";

export async function getPublicRealisations() {
  noStore();
  if (!process.env.DATABASE_URL) return [];
  return prisma.realisation.findMany({
    where: { active: true }, orderBy: { createdAt: "desc" },
    include: { media: { orderBy: { createdAt: "desc" } }, photos: { orderBy: { sortOrder: "asc" } } }
  }).catch(() => []);
}
