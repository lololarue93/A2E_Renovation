import { prisma } from "@/lib/db/prisma";

export type SiteContactSettings = {
  phone: string;
  instagram: string;
  facebook: string;
  linkedin: string;
};

export const defaultSiteContactSettings: SiteContactSettings = {
  phone: "01 89 40 00 20",
  instagram: "",
  facebook: "",
  linkedin: ""
};

export async function getSiteContactSettings(): Promise<SiteContactSettings> {
  const row = await prisma.siteSettings.findUnique({ where: { key: "site_contact" } }).catch(() => null);
  if (!row?.value || typeof row.value !== "object" || Array.isArray(row.value)) return defaultSiteContactSettings;
  return { ...defaultSiteContactSettings, ...(row.value as Partial<SiteContactSettings>) };
}
