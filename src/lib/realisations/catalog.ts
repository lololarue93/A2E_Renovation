import { prisma } from "@/lib/db/prisma";
import { unstable_noStore as noStore } from "next/cache";
import { gallerySettingsKey } from "./gallery";
import { demoProjects } from "./demo-projects";

export async function getPublicRealisations() {
  noStore();
  // A disconnected local preview is useful; a configured database always remains authoritative.
  if (!process.env.DATABASE_URL) return demoProjects;
  const items = await prisma.realisation.findMany({
    where: { active: true }, orderBy: { createdAt: "desc" },
    include: { media: { orderBy: { createdAt: "desc" } }, photos: { orderBy: { sortOrder: "asc" } } }
  }).catch(() => []);
  if (!items.length) return [];
  const settings = await prisma.siteSettings.findMany({ where: { key: { in: items.map(item => gallerySettingsKey(item.id)) } } }).catch(() => []);
  return items.map(item => ({ ...item, galleryManifest: settings.find(setting => setting.key === gallerySettingsKey(item.id))?.value }));
}
