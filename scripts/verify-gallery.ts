import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { prisma } from "../src/lib/db/prisma";
import { changeGalleryManifest, galleryAssets, gallerySettingsKey, readGalleryManifest, toGalleryProject } from "../src/lib/realisations/gallery";
import { GET as getMedia, POST as uploadMedia, PATCH as patchMedia, DELETE as deleteMedia } from "../src/app/api/admin/media/route";
import { PUT as publishProject } from "../src/app/api/admin/realisations/route";
import { getPublicRealisations } from "../src/lib/realisations/catalog";
import { demoProjects } from "../src/lib/realisations/demo-projects";

type TestAsset = { id: string; kind: string; url: string; realisationId: string; title: string; alt: string; createdAt: Date };
async function main() {
  const initial = [{ id: "before", kind: "image", url: "/test/before.jpg" }, { id: "after", kind: "image", url: "/test/after.jpg" }, { id: "detail", kind: "image", url: "/test/detail.jpg" }, { id: "video", kind: "video", url: "/test/video.mp4" }];
  let manifest = readGalleryManifest({ order: ["unknown", "after", "after"], roles: { before: "before", after: "after", detail: "after", video: "before" }, coverId: "missing", comparisonConfirmed: true }, initial);
  assert.deepEqual(manifest.order, ["after", "before", "detail", "video"], "Ordre deduplique, nouveaux medias conserves");
  assert.equal(manifest.roles.detail, "gallery"); assert.equal(manifest.roles.video, "gallery"); assert.equal(manifest.comparisonConfirmed, true);
  assert.equal(readGalleryManifest({ order: ["video", "before"], coverId: "video" }, initial).coverId, "before", "La couverture utilise une photo plutot qu'une video sans affiche");
  manifest = changeGalleryManifest(manifest, initial, "detail", { role: "after", cover: true, move: "up" });
  assert.equal(manifest.roles.after, "gallery"); assert.equal(manifest.roles.detail, "after"); assert.equal(manifest.coverId, "detail"); assert.equal(manifest.comparisonConfirmed, false, "Une nouvelle photo invalide la comparaison precedente");
  assert.deepEqual(manifest.order, ["after", "detail", "before", "video"]);
  const sameUrl = [{ id: "a", kind: "image", url: "/same.jpg" }, { id: "b", kind: "image", url: "/same.jpg" }];
  assert.equal(readGalleryManifest({ roles: { a: "before", b: "after" }, comparisonConfirmed: true }, sameUrl).comparisonConfirmed, false, "La meme image ne simule pas une transformation");
  const projectFields = { title: "Chantier de test", city: "Paris", type: "Interieur", description: "Description factuelle du chantier de test.", duration: "", budget: "", tags: [], active: false };
  const mapped = toGalleryProject({ ...projectFields, id: "real-1", media: initial, photos: [], galleryManifest: manifest });
  assert.equal(mapped.comparisons?.length, 0); assert.equal(mapped.assets.find(asset => asset.cover)?.id, "detail");
  const verified = changeGalleryManifest(manifest, initial, "before", { comparisonConfirmed: true });
  assert.equal(toGalleryProject({ ...projectFields, id: "real-1", media: initial, photos: [], galleryManifest: verified }).comparisons?.length, 1);
  assert.equal(toGalleryProject({ ...projectFields, id: "demo-realisation-0", media: initial, photos: [], galleryManifest: verified }).comparisons?.length, 0, "Pas de faux avant/apres pour les anciens exemples");
  const generated = toGalleryProject(demoProjects[0]);
  assert.equal(generated.comparisons?.length, 1); assert.equal(generated.inspiration, true); assert.equal("generated" in generated, false);
  assert.equal(generated.comparisons?.[0].beforeLabel, "Avant envisag\u00e9"); assert.equal(generated.comparisons?.[0].afterLabel, "Apr\u00e8s projet\u00e9");
  const companyCopy = { ...projectFields, id: "real-1", title: "Realisation editee", description: "Texte factuel de l'equipe, sans libelle impose.", duration: "Deux semaines", budget: "Budget reel documente", tags: ["Finitions"], media: initial, photos: [], galleryManifest: verified };
  const realProject = toGalleryProject(companyCopy);
  assert.equal(realProject.inspiration, false); assert.equal(realProject.title, companyCopy.title); assert.equal(realProject.description, companyCopy.description); assert.deepEqual(realProject.tags, companyCopy.tags);
  assert.equal(realProject.duration, companyCopy.duration); assert.equal(realProject.budget, companyCopy.budget);
  assert.equal(realProject.comparisons?.[0].label, "La transformation"); assert.equal(realProject.comparisons?.[0].beforeLabel, undefined, "Les vraies realisations conservent leurs labels avant/apres");
  const customDemo = toGalleryProject({ ...demoProjects[0], title: "Inspiration editee", description: "Une nouvelle intention redigee par l'equipe.", budget: "Ne pas attribuer de budget client", duration: "Ne pas attribuer de duree", media: demoProjects[0].media.map(asset => ({ ...asset, alt: "Materiau choisi par l'equipe" })) });
  assert.equal(customDemo.title, "Inspiration editee"); assert.equal(customDemo.description, "Une nouvelle intention redigee par l'equipe.");
  assert.ok(customDemo.assets.every(asset => asset.alt === "Materiau choisi par l'equipe")); assert.equal(customDemo.duration, ""); assert.equal(customDemo.budget, "");
  assert.equal(toGalleryProject({ ...projectFields, id: "demo-realisation-77-unknown", media: initial, photos: [], galleryManifest: verified }).comparisons?.length, 0, "Seuls les trois IDs generes documentes autorisent la demonstration");
  assert.equal(toGalleryProject({ ...projectFields, id: "real-1", media: [], photos: [{ beforeUrl: "/old-before.jpg", afterUrl: "/old-after.jpg" }] }).comparisons?.length, 1, "Les paires historiques explicites restent disponibles");
  assert.equal(galleryAssets(initial, null, "Chantier").length, 4);

  const original = { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD, database: process.env.DATABASE_URL, transaction: prisma.$transaction, mediaFindMany: prisma.mediaAsset.findMany, realisationFindMany: prisma.realisation.findMany, settingsFindMany: prisma.siteSettings.findMany };
  const auth = `Basic ${Buffer.from("admin@example.test:gallery-test-only").toString("base64")}`;
  const request = (path: string, method = "GET", body?: unknown, authenticated = true) => new NextRequest(`http://localhost/api/admin/${path}`, { method, headers: { ...(authenticated ? { authorization: auth } : {}), "content-type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const assets: TestAsset[] = initial.map(asset => ({ ...asset, realisationId: "real-1", title: asset.id, alt: `Vue ${asset.id}`, createdAt: new Date() }));
  const projects = [{ ...projectFields, id: "real-1", photos: [] }, { ...projectFields, id: "draft-1", photos: [] }];
  const rows = new Map<string, unknown>(); const audits: unknown[] = []; let reads = 0;
  const findAssets = async (input?: { where?: { realisationId?: string } }) => { reads++; return assets.filter(asset => !input?.where?.realisationId || asset.realisationId === input.where.realisationId); };
  const findProjects = async (input?: { where?: { active?: boolean } }) => { reads++; return projects.filter(project => input?.where?.active === undefined || project.active === input.where.active).map(project => ({ ...project, media: assets.filter(asset => asset.realisationId === project.id) })); };
  const findSettings = async () => { reads++; return [...rows.entries()].map(([key, value]) => ({ key, value })); };
  const tx = {
    mediaAsset: { findMany: findAssets, findUnique: async (input: { where: { id: string } }) => assets.find(asset => asset.id === input.where.id) ?? null, findFirst: async (input: { where: { realisationId: string; kind: string } }) => assets.find(asset => asset.realisationId === input.where.realisationId && asset.kind === input.where.kind) ?? null, update: async (input: { where: { id: string }; data: Partial<TestAsset> }) => { const item = assets.find(asset => asset.id === input.where.id)!; for (const [key, value] of Object.entries(input.data)) if (value !== undefined) Object.assign(item, { [key]: value }); return item; }, delete: async (input: { where: { id: string } }) => assets.splice(assets.findIndex(asset => asset.id === input.where.id), 1)[0] },
    realisation: { findUnique: async (input: { where: { id: string } }) => projects.find(project => project.id === input.where.id) ?? null, update: async (input: { where: { id: string }; data: Partial<typeof projectFields> }) => { const item = projects.find(project => project.id === input.where.id)!; Object.assign(item, input.data); return item; } },
    realisationPhoto: { findFirst: async () => null },
    siteSettings: { findUnique: async (input: { where: { key: string } }) => rows.has(input.where.key) ? { value: rows.get(input.where.key) } : null, upsert: async (input: { where: { key: string }; update: { value: unknown } }) => { rows.set(input.where.key, JSON.parse(JSON.stringify(input.update.value))); return { key: input.where.key, value: input.update.value }; } },
    auditLog: { create: async (input: unknown) => { audits.push(input); return input; } }
  };
  try {
    process.env.ADMIN_EMAIL = "admin@example.test"; process.env.ADMIN_PASSWORD = "gallery-test-only";
    prisma.mediaAsset.findMany = findAssets as unknown as typeof prisma.mediaAsset.findMany;
    prisma.realisation.findMany = findProjects as unknown as typeof prisma.realisation.findMany;
    prisma.siteSettings.findMany = findSettings as unknown as typeof prisma.siteSettings.findMany;
    prisma.$transaction = (async (operation: (client: typeof tx) => Promise<unknown>) => operation(tx)) as unknown as typeof prisma.$transaction;
    for (const [handler, method] of [[getMedia, "GET"], [uploadMedia, "POST"], [patchMedia, "PATCH"], [deleteMedia, "DELETE"]] as const) assert.equal((await handler(request("media", method, undefined, false))).status, 401);
    assert.equal(reads, 0, "Auth refusee avant toute lecture des medias");
    assert.equal((await patchMedia(request("media", "PATCH", { id: "before", role: "before" }))).status, 200);
    assert.equal((await patchMedia(request("media", "PATCH", { id: "before", comparisonConfirmed: true }))).status, 400);
    assert.equal((await patchMedia(request("media", "PATCH", { id: "after", role: "after" }))).status, 200);
    assert.equal((await patchMedia(request("media", "PATCH", { id: "before", comparisonConfirmed: true }))).status, 200);
    assert.equal((await patchMedia(request("media", "PATCH", { id: "video", role: "before" }))).status, 400);
    assert.equal((await patchMedia(request("media", "PATCH", { id: "video", cover: true }))).status, 400);
    assert.equal((await patchMedia(request("media", "PATCH", { id: "detail", move: "up", cover: true, title: "Nouveau titre", alt: "Description utile" }))).status, 200);
    const loaded = await (await getMedia(request("media"))).json(); const detail = loaded.assets.find((asset: { id: string }) => asset.id === "detail");
    assert.equal(detail.cover, true); assert.equal(detail.sortOrder, 1); assert.equal(detail.title, "Nouveau titre"); assert.equal(detail.alt, "Description utile"); assert.equal(detail.comparisonConfirmed, true, "Ordre/couverture ne changent pas la comparaison");
    assert.equal((await patchMedia(request("media", "PATCH", { id: "detail", role: "after" }))).status, 200);
    const changed = await (await getMedia(request("media"))).json(); assert.equal(changed.assets.find((asset: { id: string }) => asset.id === "after").role, "gallery"); assert.equal(changed.assets.find((asset: { id: string }) => asset.id === "detail").comparisonConfirmed, false);
    assert.equal((await publishProject(request("realisations", "PUT", { ...projectFields, id: "draft-1", active: true }))).status, 400, "Publication sans photo refusee");
    assert.equal((await publishProject(request("realisations", "PUT", { ...projectFields, id: "real-1", active: true }))).status, 200);
    process.env.DATABASE_URL = "postgresql://test-unused";
    const published = await getPublicRealisations(); assert.deepEqual(published.map(project => project.id), ["real-1"], "Les brouillons restent hors galerie publique");
    delete process.env.DATABASE_URL;
    assert.deepEqual((await getPublicRealisations()).map(project => project.id), demoProjects.map(project => project.id), "Trois exemples pour l'apercu local sans base");
    process.env.DATABASE_URL = "postgresql://test-unused";
    assert.equal(toGalleryProject(published[0]).assets.find(asset => asset.cover)?.id, "detail");
    for (const id of ["before", "after", "video"]) assert.equal((await deleteMedia(request(`media?id=${id}`, "DELETE"))).status, 200);
    assert.equal((await deleteMedia(request("media?id=detail", "DELETE"))).status, 409, "Derniere image publiee protegee");
    assert.equal((await publishProject(request("realisations", "PUT", { ...projectFields, id: "real-1", active: false }))).status, 200);
    assert.equal((await getPublicRealisations()).length, 0, "Une base configuree reste l'autorite meme sans fiche publiee, sans fallback demo");
    assert.equal((await deleteMedia(request("media?id=detail", "DELETE"))).status, 200);
    assert.equal(readGalleryManifest(rows.get(gallerySettingsKey("real-1")), assets).order.length, 0);
    assert.ok(audits.length > 0, "Classement, comparaison et suppression audites");
    prisma.$transaction = (async () => { throw new Error("Database offline"); }) as typeof prisma.$transaction;
    assert.equal((await patchMedia(request("media", "PATCH", { id: "detail", cover: true }))).status, 503);
    prisma.mediaAsset.findMany = (async () => { throw new Error("Database offline"); }) as typeof prisma.mediaAsset.findMany;
    assert.equal((await getMedia(request("media"))).status, 503);
  } finally {
    prisma.$transaction = original.transaction; prisma.mediaAsset.findMany = original.mediaFindMany; prisma.realisation.findMany = original.realisationFindMany; prisma.siteSettings.findMany = original.settingsFindMany;
    for (const [key, value] of [["ADMIN_EMAIL", original.email], ["ADMIN_PASSWORD", original.password], ["DATABASE_URL", original.database]]) { if (value === undefined) delete process.env[key!]; else process.env[key!] = value; }
    await prisma.$disconnect();
  }
  console.log("PASS : galerie source publiee, roles uniques, comparaison explicite, ordre/couverture/description relus, autorisation, publication sans photo refusee, suppression protegee et erreurs API. Donnees de test en memoire, aucun fichier ni email envoye.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
