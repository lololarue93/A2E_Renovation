import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin, getRequestActor } from "@/lib/auth/require-admin";
import { changeGalleryManifest, gallerySettingsKey, readGalleryManifest } from "@/lib/realisations/gallery";

export const dynamic = "force-dynamic";
const maxBytes = 50 * 1024 * 1024;
const allowed = new Map([["image/jpeg", "jpg"], ["image/png", "png"], ["image/webp", "webp"], ["video/mp4", "mp4"], ["video/webm", "webm"]]);
const uploadFields = z.object({ realisationId: z.string().trim().min(1).max(100), title: z.string().trim().max(160), alt: z.string().trim().max(300), role: z.enum(["gallery", "before", "after"]).default("gallery") });
const patchFields = z.object({ id: z.string().min(1).max(100), title: z.string().trim().max(160).optional(), alt: z.string().trim().max(300).optional(), role: z.enum(["gallery", "before", "after"]).optional(), cover: z.boolean().optional(), move: z.enum(["up", "down"]).optional(), comparisonConfirmed: z.boolean().optional() }).strict();
const failure = (message: string, status = 503) => NextResponse.json({ error: message }, { status });

export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request); if (denied) return denied;
  try {
    const [assets, realisations, settings] = await Promise.all([
      prisma.mediaAsset.findMany({ orderBy: { createdAt: "asc" }, include: { realisation: { select: { title: true, active: true } } } }),
      prisma.realisation.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, title: true, active: true } }),
      prisma.siteSettings.findMany({ where: { key: { startsWith: "gallery:" } } })
    ]);
    const enriched = assets.map(asset => {
      const projectAssets = assets.filter(item => item.realisationId === asset.realisationId);
      const manifest = readGalleryManifest(settings.find(row => row.key === gallerySettingsKey(asset.realisationId ?? ""))?.value, projectAssets);
      return { ...asset, role: manifest.roles[asset.id], sortOrder: manifest.order.indexOf(asset.id), cover: asset.id === manifest.coverId, comparisonConfirmed: manifest.comparisonConfirmed };
    });
    return NextResponse.json({ assets: enriched, realisations }, { headers: { "Cache-Control": "no-store" } });
  } catch { return failure("La bibliothèque est indisponible. Réessayez après avoir vérifié la connexion à la base."); }
}

export async function POST(request: NextRequest) {
  const denied = await requireAdmin(request); if (denied) return denied;
  const form = await request.formData().catch(() => null);
  if (!form) return failure("Le fichier n'a pas pu être lu. Réessayez l'envoi.", 400);
  const file = form.get("file");
  if (!(file instanceof File) || !file.size || !allowed.has(file.type) || file.size > maxBytes) return failure("Choisissez un JPEG, PNG, WebP, MP4 ou WebM de moins de 50 Mo.", 400);
  const parsed = uploadFields.safeParse({ realisationId: form.get("realisationId"), title: form.get("title") ?? "", alt: form.get("alt") ?? "", role: form.get("role") ?? "gallery" });
  if (!parsed.success) return failure("Choisissez une fiche enregistrée et vérifiez le titre et la description du média.", 400);
  if (file.type.startsWith("video/") && parsed.data.role !== "gallery") return failure("L'avant/après utilise deux photos. Ajoutez cette vidéo à la galerie.", 400);
  const filename = `${randomUUID()}.${allowed.get(file.type)!}`;
  const directory = join(process.cwd(), "public", "uploads", "realisations");
  const diskPath = join(directory, filename);
  let written = false;
  try {
    const existing = await prisma.realisation.findUnique({ where: { id: parsed.data.realisationId }, select: { id: true } });
    if (!existing) return failure("Cette fiche n'existe plus. Créez ou sélectionnez une réalisation avant l'envoi.", 404);
    await mkdir(directory, { recursive: true });
    await writeFile(diskPath, Buffer.from(await file.arrayBuffer())); written = true;
    const asset = await prisma.$transaction(async tx => {
      const projectAssets = await tx.mediaAsset.findMany({ where: { realisationId: existing.id }, orderBy: { createdAt: "asc" } });
      const row = await tx.siteSettings.findUnique({ where: { key: gallerySettingsKey(existing.id) } });
      const created = await tx.mediaAsset.create({ data: { kind: file.type.startsWith("video/") ? "video" : "image", url: `/uploads/realisations/${filename}`, title: parsed.data.title || file.name.slice(0, 160), alt: parsed.data.alt || parsed.data.title || file.name.slice(0, 160), realisationId: existing.id } });
      const assets = [...projectAssets, created];
      const manifest = changeGalleryManifest(readGalleryManifest(row?.value, assets), assets, created.id, { role: parsed.data.role });
      await tx.siteSettings.upsert({ where: { key: gallerySettingsKey(existing.id) }, create: { key: gallerySettingsKey(existing.id), value: manifest }, update: { value: manifest } });
      await tx.auditLog.create({ data: { actor: await getRequestActor(request), action: "media.uploaded", entity: "MediaAsset", entityId: created.id, payload: { realisationId: existing.id, role: parsed.data.role } } });
      return created;
    }, { isolationLevel: "Serializable" });
    return NextResponse.json({ ok: true, asset }, { status: 201 });
  } catch { if (written) await unlink(diskPath).catch(() => undefined); return failure("Envoi non enregistré. Le fichier n'a pas été associé à la fiche ; réessayez."); }
}

export async function PATCH(request: NextRequest) {
  const denied = await requireAdmin(request); if (denied) return denied;
  const parsed = patchFields.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return failure("Les informations du média sont invalides.", 400);
  try {
    const result = await prisma.$transaction(async tx => {
      const asset = await tx.mediaAsset.findUnique({ where: { id: parsed.data.id } });
      if (!asset?.realisationId) return { error: "Ce média n'est pas associé à une fiche.", status: 404 };
      if (asset.kind !== "image" && parsed.data.role && parsed.data.role !== "gallery") return { error: "Une vidéo ne peut pas servir de photo avant/après.", status: 400 };
      if (asset.kind !== "image" && parsed.data.cover) return { error: "Choisissez une photo pour la couverture de la fiche.", status: 400 };
      const assets = await tx.mediaAsset.findMany({ where: { realisationId: asset.realisationId }, orderBy: { createdAt: "asc" } });
      const key = gallerySettingsKey(asset.realisationId);
      const row = await tx.siteSettings.findUnique({ where: { key } });
      const manifest = changeGalleryManifest(readGalleryManifest(row?.value, assets), assets, asset.id, parsed.data);
      if (parsed.data.comparisonConfirmed && !manifest.comparisonConfirmed) return { error: "Associez deux photos différentes, l'une Avant et l'autre Après, avant de confirmer la comparaison.", status: 400 };
      const updated = await tx.mediaAsset.update({ where: { id: asset.id }, data: { title: parsed.data.title, alt: parsed.data.alt } });
      await tx.siteSettings.upsert({ where: { key }, create: { key, value: manifest }, update: { value: manifest } });
      await tx.auditLog.create({ data: { actor: await getRequestActor(request), action: "media.updated", entity: "MediaAsset", entityId: asset.id, payload: { realisationId: asset.realisationId, role: manifest.roles[asset.id], cover: manifest.coverId === asset.id, order: manifest.order, comparisonConfirmed: manifest.comparisonConfirmed } } });
      return { asset: updated, manifest };
    }, { isolationLevel: "Serializable" });
    if ("error" in result) return failure(result.error!, result.status);
    return NextResponse.json({ ok: true, ...result });
  } catch { return failure("Modification non enregistrée. Rechargez la bibliothèque puis réessayez."); }
}

export async function DELETE(request: NextRequest) {
  const denied = await requireAdmin(request); if (denied) return denied;
  const id = request.nextUrl.searchParams.get("id");
  if (!id || id.length > 100) return failure("Média introuvable.", 400);
  try {
    const result = await prisma.$transaction(async tx => {
      const asset = await tx.mediaAsset.findUnique({ where: { id } });
      if (!asset) return null;
      if (asset.realisationId) {
        const assets = await tx.mediaAsset.findMany({ where: { realisationId: asset.realisationId }, orderBy: { createdAt: "asc" } });
        const project = await tx.realisation.findUnique({ where: { id: asset.realisationId } });
        const remaining = assets.filter(item => item.id !== id);
        const hasLegacy = await tx.realisationPhoto.findFirst({ where: { realisationId: asset.realisationId, OR: [{ beforeUrl: { not: null } }, { afterUrl: { not: null } }] } });
        if (project?.active && !remaining.some(item => item.kind === "image") && !hasLegacy) return { error: "Cette photo est le dernier visuel du chantier publié. Passez d'abord la fiche en brouillon ou ajoutez une autre photo." };
        const key = gallerySettingsKey(asset.realisationId);
        const row = await tx.siteSettings.findUnique({ where: { key } });
        const manifest = readGalleryManifest(row?.value, remaining);
        await tx.siteSettings.upsert({ where: { key }, create: { key, value: manifest }, update: { value: manifest } });
      }
      await tx.mediaAsset.delete({ where: { id } });
      await tx.auditLog.create({ data: { actor: await getRequestActor(request), action: "media.deleted", entity: "MediaAsset", entityId: id, payload: { realisationId: asset.realisationId } } });
      return { asset };
    }, { isolationLevel: "Serializable" });
    if (!result) return failure("Ce média n'existe plus.", 404);
    if ("error" in result) return failure(result.error ?? "Suppression refusée.", 409);
    if (/^\/uploads\/realisations\/[a-f\d-]+\.(jpg|png|webp|mp4|webm)$/.test(result.asset.url)) await unlink(join(process.cwd(), "public", result.asset.url.replace(/^\/+/, ""))).catch(() => undefined);
    return NextResponse.json({ ok: true });
  } catch { return failure("Suppression non confirmée. Rechargez la bibliothèque avant de réessayer."); }
}
