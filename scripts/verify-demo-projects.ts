import assert from "node:assert/strict";
import { join } from "node:path";
import type { PrismaClient } from "@prisma/client";
import sharp from "sharp";
import { demoProjectNotice, demoProjects } from "../src/lib/realisations/demo-projects";
import { gallerySettingsKey, toGalleryProject } from "../src/lib/realisations/gallery";
import { assertDemoImportAllowed, importDemoProjects } from "../src/lib/realisations/import-demo-projects";

function database() {
  const projects = new Map<string, Record<string, unknown>>([["real-untouched", { id: "real-untouched", title: "Chantier reel", active: true }]]);
  const media = new Map<string, Record<string, unknown>>();
  const settings = new Map<string, unknown>();
  const tx = {
    realisation: {
      findUnique: async ({ where }: { where: { id: string } }) => projects.get(where.id),
      create: async ({ data }: { data: Record<string, unknown> }) => { assert.ok(!projects.has(String(data.id))); projects.set(String(data.id), structuredClone(data)); return data; }
    },
    mediaAsset: { create: async ({ data }: { data: Record<string, unknown> }) => { assert.ok(!media.has(String(data.id))); media.set(String(data.id), structuredClone(data)); return data; } },
    siteSettings: { create: async ({ data }: { data: { key: string; value: unknown } }) => { assert.ok(!settings.has(data.key)); settings.set(data.key, structuredClone(data.value)); return data; } }
  };
  const prisma = { $transaction: async (run: (client: typeof tx) => Promise<unknown>, options: { isolationLevel: string }) => { assert.equal(options.isolationLevel, "Serializable"); return run(tx); } } as unknown as PrismaClient;
  return { prisma, projects, media, settings };
}

async function main() {
  const confirmed = { A2E_IMPORT_DEMO_PROJECTS: "confirm-fictional-drafts", DATABASE_URL: "postgresql://test-unused" };
  assert.throws(() => assertDemoImportAllowed({}), /A2E_IMPORT_DEMO_PROJECTS/);
  assert.throws(() => assertDemoImportAllowed({ ...confirmed, DATABASE_URL: undefined }), /DATABASE_URL/);
  assert.throws(() => assertDemoImportAllowed({ ...confirmed, NODE_ENV: "production" }), /A2E_ALLOW_DEMO_IMPORT/);
  assert.doesNotThrow(() => assertDemoImportAllowed(confirmed));
  assert.doesNotThrow(() => assertDemoImportAllowed({ ...confirmed, NODE_ENV: "production", A2E_ALLOW_DEMO_IMPORT: "1" }));
  assert.equal(demoProjects.length, 3);
  for (const item of demoProjects) {
    assert.equal(item.active, false); assert.equal(item.duration, ""); assert.equal(item.budget, "");
    const gallery = toGalleryProject(item);
    assert.equal(gallery.generated, true); assert.equal(gallery.inspiration, true);
    assert.equal(gallery.comparisons?.length, 1); assert.ok(gallery.description.includes(demoProjectNotice));
    assert.equal(gallery.comparisons?.[0].beforeLabel, "Avant imagine");
    assert.equal(gallery.assets.find(asset => asset.cover)?.role, "after");
    assert.ok(toGalleryProject({ ...item, description: "Description modifiee dans l'admin." }).description.startsWith(demoProjectNotice), "Le signalement reste present apres edition");
    const dimensions = await Promise.all(item.media.map(asset => sharp(join(process.cwd(), "public", asset.url.replace(/^\/+/, ""))).metadata()));
    for (const image of dimensions) { assert.equal(image.format, "webp"); assert.equal(image.width, 1200); assert.equal(image.height, 800); }
  }
  const drafts = database();
  const first = await importDemoProjects(drafts.prisma);
  assert.equal(first.created.length, 3); assert.equal(drafts.media.size, 6); assert.equal(drafts.settings.size, 3);
  for (const id of first.created) assert.equal(drafts.projects.get(id)?.active, false);
  const melun = demoProjects[0];
  drafts.projects.set(melun.id, { ...drafts.projects.get(melun.id), title: "Titre edite et relu", description: "Texte de l'equipe", active: false });
  drafts.settings.set(gallerySettingsKey(melun.id), { ...melun.galleryManifest, order: [...melun.galleryManifest.order].reverse() });
  const snapshot = JSON.stringify([...drafts.projects, ...drafts.media, ...drafts.settings]);
  const second = await importDemoProjects(drafts.prisma, { publishDemo: true });
  assert.equal(second.created.length, 0); assert.equal(second.skipped.length, 3);
  assert.equal(JSON.stringify([...drafts.projects, ...drafts.media, ...drafts.settings]), snapshot, "Reexecution conserve editions, roles et statut ; le chantier reel reste intact");
  const published = database();
  await importDemoProjects(published.prisma, { publishDemo: true });
  for (const item of demoProjects) assert.equal(published.projects.get(item.id)?.active, true, "Publication opt-in seulement lors de la creation");
  assert.equal(published.projects.get("real-untouched")?.title, "Chantier reel");
  console.log("PASS : 3 paires WebP locales, signalement fictif persistant, roles/couverture, gardes, import brouillon/publication opt-in et reexecution sans ecrasement. Aucun acces base reel.");
}

main().catch(error => { console.error(error); process.exitCode = 1; });
