import { access } from "node:fs/promises";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { demoProjects } from "../src/lib/realisations/demo-projects";
import { assertDemoImportAllowed, importDemoProjects } from "../src/lib/realisations/import-demo-projects";

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const publishDemo = process.argv.includes("--publish-demo");
  for (const item of demoProjects) for (const asset of item.media) await access(join(process.cwd(), "public", asset.url.replace(/^\/+/, "")));
  if (dryRun) {
    console.log("Apercu sans base : 3 projets fictifs, 6 images generees locales. Les fiches existantes seront conservees.");
    for (const item of demoProjects) console.log(`${item.id} | ${item.city} | active=${publishDemo} a la creation | ${item.media.length} images`);
    return;
  }
  assertDemoImportAllowed(process.env);
  const prisma = new PrismaClient();
  try {
    const result = await importDemoProjects(prisma, { publishDemo });
    console.log(`Import termine : ${result.created.length} exemples ${publishDemo ? "publies" : "en brouillon"} crees, ${result.skipped.length} fiches existantes conservees. Aucun chantier reel modifie.`);
  } finally { await prisma.$disconnect(); }
}

main().catch(error => { console.error(error instanceof Error ? error.message : "Import impossible."); process.exitCode = 1; });
