import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { realisations as demoRealisations } from "@/lib/site-data";

const maxBytes = 50 * 1024 * 1024;
const allowed = new Map([["image/jpeg", "jpg"], ["image/png", "png"], ["image/webp", "webp"], ["video/mp4", "mp4"], ["video/webm", "webm"]]);

export async function GET() {
  const [assets, dbRealisations] = await Promise.all([
    prisma.mediaAsset.findMany({ orderBy: { createdAt: "desc" }, include: { realisation: { select: { title: true } } } }).catch(() => []),
    prisma.realisation.findMany({ where: { active: true }, orderBy: { createdAt: "desc" }, select: { id: true, title: true } }).catch(() => [])
  ]);
  const catalog = demoRealisations.map((item, index) => ({ id: `demo-realisation-${index}`, title: item.title }));
  const mergedRealisations = [...dbRealisations, ...catalog.filter((demo) => !dbRealisations.some((item) => item.id === demo.id))];
  return NextResponse.json({ assets, realisations: mergedRealisations });
}

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || !allowed.has(file.type) || file.size > maxBytes) return NextResponse.json({ ok: false, error: "Format ou taille non autorise (JPEG, PNG, WebP, MP4, WebM, 50 Mo max)." }, { status: 400 });
  const extension = allowed.get(file.type)!;
  const filename = `${randomUUID()}.${extension}`;
  const directory = join(process.cwd(), "public", "uploads", "realisations");
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, filename), Buffer.from(await file.arrayBuffer()));
  const requestedRealisationId = typeof form.get("realisationId") === "string" ? String(form.get("realisationId")) : "";
  const demoIndex = requestedRealisationId.match(/^demo-realisation-(\d+)$/)?.[1];
  if (demoIndex && demoRealisations[Number(demoIndex)]) {
    const demo = demoRealisations[Number(demoIndex)];
    await prisma.realisation.upsert({ where: { id: requestedRealisationId }, update: {}, create: { id: requestedRealisationId, ...demo, description: `${demo.title} - projet gere depuis la bibliotheque media.` } });
  } else if (requestedRealisationId) {
    const existing = await prisma.realisation.findUnique({ where: { id: requestedRealisationId }, select: { id: true } });
    if (!existing) return NextResponse.json({ ok: false, error: "Realisation introuvable" }, { status: 400 });
  }
  const asset = await prisma.mediaAsset.create({ data: { kind: file.type.startsWith("video/") ? "video" : "image", url: `/uploads/realisations/${filename}`, title: typeof form.get("title") === "string" && form.get("title") ? String(form.get("title")) : file.name, alt: typeof form.get("alt") === "string" && form.get("alt") ? String(form.get("alt")) : file.name, realisationId: requestedRealisationId || undefined } });
  await prisma.auditLog.create({ data: { actor: "admin", action: "media.uploaded", entity: "MediaAsset", entityId: asset.id, payload: { kind: asset.kind, url: asset.url } } }).catch(() => undefined);
  return NextResponse.json({ ok: true, asset });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ ok: false, error: "Media introuvable" }, { status: 400 });
  const asset = await prisma.mediaAsset.update({ where: { id }, data: { title: typeof body.title === "string" ? body.title.slice(0, 160) : undefined, alt: typeof body.alt === "string" ? body.alt.slice(0, 160) : undefined, realisationId: typeof body.realisationId === "string" && body.realisationId ? body.realisationId : null } }).catch(() => null);
  if (!asset) return NextResponse.json({ ok: false, error: "Media introuvable" }, { status: 404 });
  return NextResponse.json({ ok: true, asset });
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ ok: false, error: "Media introuvable" }, { status: 400 });
  const asset = await prisma.mediaAsset.delete({ where: { id } }).catch(() => null);
  if (!asset) return NextResponse.json({ ok: false, error: "Media introuvable" }, { status: 404 });
  if (asset.url.startsWith("/uploads/")) await unlink(join(process.cwd(), "public", asset.url.replace(/^\/+/, ""))).catch(() => undefined);
  await prisma.auditLog.create({ data: { actor: "admin", action: "media.deleted", entity: "MediaAsset", entityId: asset.id, payload: { url: asset.url } } }).catch(() => undefined);
  return NextResponse.json({ ok: true });
}
