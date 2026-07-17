import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

const maxBytes = 50 * 1024 * 1024;
const allowed = new Map([["image/jpeg", "jpg"], ["image/png", "png"], ["image/webp", "webp"], ["video/mp4", "mp4"], ["video/webm", "webm"]]);

export async function GET() {
  const [assets, realisations] = await Promise.all([
    prisma.mediaAsset.findMany({ orderBy: { createdAt: "desc" }, include: { realisation: { select: { title: true } } } }).catch(() => []),
    prisma.realisation.findMany({ where: { active: true }, orderBy: { createdAt: "desc" }, select: { id: true, title: true } }).catch(() => [])
  ]);
  return NextResponse.json({ assets, realisations });
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
  const asset = await prisma.mediaAsset.create({ data: { kind: file.type.startsWith("video/") ? "video" : "image", url: `/uploads/realisations/${filename}`, title: typeof form.get("title") === "string" ? String(form.get("title")) : file.name, alt: typeof form.get("alt") === "string" ? String(form.get("alt")) : file.name, realisationId: typeof form.get("realisationId") === "string" && form.get("realisationId") ? String(form.get("realisationId")) : undefined } });
  await prisma.auditLog.create({ data: { actor: "admin", action: "media.uploaded", entity: "MediaAsset", entityId: asset.id, payload: { kind: asset.kind, url: asset.url } } }).catch(() => undefined);
  return NextResponse.json({ ok: true, asset });
}
