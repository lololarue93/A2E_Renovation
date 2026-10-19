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
    assert.equal(gallery.inspiration, true); assert.equal("generated" in gallery, false, "La provenance reste hors presentation publique");
    assert.equal(gallery.comparisons?.length, 1); assert.equal(gallery.description.includes(demoProjectNotice), false);
    assert.equal(gallery.comparisons?.[0].beforeLabel, "Avant envisag\u00e9");
    assert.equal(gallery.comparisons?.[0].afterLabel, "Apr\u00e8s projet\u00e9");
    assert.equal(gallery.assets.find(asset => asset.cover)?.role, "after");
    assert.equal(toGalleryProject({ ...item, description: "Description modifiee dans l'admin." }).description, "Description modifiee dans l'admin.", "Une edition ne recoit aucune mention technique forcee");
    const legacy = { ...item, active: true, description: `${demoProjectNotice} Une intention a adapter a la maison.`, tags: ["Sejour", "Projet fictif", "Images generees"], media: item.media.map(asset => ({ ...asset, title: `${asset.title} (image generee)`, alt: `Image generee, projet fictif : ${asset.alt}, apres imagine` })) };
    const snapshot = JSON.stringify(legacy);
    const publicLegacy = toGalleryProject(legacy);
    assert.equal(JSON.stringify(legacy), snapshot, "Conversion a la lecture, aucune edition de la fiche source");
    assert.equal(publicLegacy.inspiration, true); assert.equal(publicLegacy.published, true);
    assert.deepEqual(publicLegacy.tags, ["Sejour"]);
    assert.equal(publicLegacy.description, "Une intention a adapter a la maison.");
    const copy = [publicLegacy.title, publicLegacy.description, ...publicLegacy.tags, ...publicLegacy.assets.map(asset => asset.alt), ...(publicLegacy.comparisons ?? []).flatMap(pair => [pair.label, pair.beforeLabel, pair.afterLabel])].join(" ").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    assert.equal(/fictif|images? generees?|chantier A2E|avant travaux|apres travaux/i.test(copy), false, "Les anciennes fiches SQL sont presentees comme des inspirations, sans attribution de chantier");
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
  console.log("PASS : 3 paires WebP locales, presentation inspiration y compris anciennes fiches, provenance privee, roles/couverture, gardes, import brouillon/publication opt-in et reexecution sans ecrasement. Aucun acces base reel.");
}

main().catch(error => { console.error(error); process.exitCode = 1; });
