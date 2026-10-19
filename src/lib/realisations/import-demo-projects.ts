import type { PrismaClient } from "@prisma/client";
import { demoProjects } from "./demo-projects";
import { gallerySettingsKey } from "./gallery";

export function assertDemoImportAllowed(env: Record<string, string | undefined>) {
  if (env.A2E_IMPORT_DEMO_PROJECTS !== "confirm-fictional-drafts") throw new Error("Import refuse : definir A2E_IMPORT_DEMO_PROJECTS=confirm-fictional-drafts pour importer explicitement les exemples.");
  if (env.NODE_ENV === "production" && env.A2E_ALLOW_DEMO_IMPORT !== "1") throw new Error("Import refuse en production : A2E_ALLOW_DEMO_IMPORT=1 doit confirmer l'import ponctuel par l'operateur.");
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL requise pour la base cible. Aucune base n'a ete modifiee.");
}

export async function importDemoProjects(prisma: PrismaClient, options: { publishDemo?: boolean } = {}) {
  return prisma.$transaction(async tx => {
    const result: { created: string[]; skipped: string[] } = { created: [], skipped: [] };
    for (const { media, photos: _photos, galleryManifest, ...fields } of demoProjects) {
      // Existing records may have been edited or unpublished by the team. Never reset them.
      if (await tx.realisation.findUnique({ where: { id: fields.id }, select: { id: true } })) {
        result.skipped.push(fields.id);
        continue;
      }
      await tx.realisation.create({ data: { ...fields, active: options.publishDemo === true } });
      for (const asset of media) await tx.mediaAsset.create({ data: { ...asset, realisationId: fields.id } });
      await tx.siteSettings.create({ data: { key: gallerySettingsKey(fields.id), value: galleryManifest } });
      result.created.push(fields.id);
    }
    return result;
  }, { isolationLevel: "Serializable" });
}
