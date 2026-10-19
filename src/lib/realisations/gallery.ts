import { isGeneratedDemoProject } from "./demo-projects";

export type GalleryRole = "gallery" | "before" | "after";
export type GalleryManifest = { version: 1; order: string[]; roles: Record<string, GalleryRole>; coverId: string | null; comparisonConfirmed: boolean };
export type GalleryAsset = { id?: string; url: string; alt: string; kind: string; role?: GalleryRole; cover?: boolean };
export type GalleryComparison = { before: GalleryAsset; after: GalleryAsset; label: string; beforeLabel?: string; afterLabel?: string };
export type GalleryProject = { id: string; title: string; city: string; type: string; description: string; duration: string; budget: string; tags: string[]; inspiration: boolean; published?: boolean; assets: GalleryAsset[]; comparisons?: GalleryComparison[] };
export const gallerySettingsKey = (id: string) => `gallery:${id}`;

type StoredAsset = { id: string; kind: string; url: string; title?: string | null; alt?: string | null };
export function readGalleryManifest(value: unknown, assets: StoredAsset[]): GalleryManifest {
  const data = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const ids = new Set(assets.map(asset => asset.id));
  const requested = Array.isArray(data.order) ? data.order.filter((id): id is string => typeof id === "string" && ids.has(id)) : [];
  const order = [...new Set([...requested, ...assets.map(asset => asset.id)])];
  const suppliedRoles = data.roles && typeof data.roles === "object" && !Array.isArray(data.roles) ? data.roles as Record<string, unknown> : {};
  const roles: Record<string, GalleryRole> = {};
  const used = new Set<string>();
  for (const id of order) {
    const role = suppliedRoles[id];
    const image = assets.find(asset => asset.id === id)?.kind === "image";
    if (image && (role === "before" || role === "after") && !used.has(role)) { roles[id] = role; used.add(role); }
    else roles[id] = "gallery";
  }
  const coverId = typeof data.coverId === "string" && assets.some(asset => asset.id === data.coverId && asset.kind === "image") ? data.coverId : order.find(id => assets.find(asset => asset.id === id)?.kind === "image") ?? order[0] ?? null;
  const before = assets.find(asset => roles[asset.id] === "before");
  const after = assets.find(asset => roles[asset.id] === "after");
  return { version: 1, order, roles, coverId, comparisonConfirmed: data.comparisonConfirmed === true && !!before && !!after && before.url !== after.url };
}

export function changeGalleryManifest(current: GalleryManifest, assets: StoredAsset[], id: string, patch: { role?: GalleryRole; cover?: boolean; move?: "up" | "down"; comparisonConfirmed?: boolean }): GalleryManifest {
  const next: GalleryManifest = { ...current, order: [...current.order], roles: { ...current.roles } };
  if (patch.role !== undefined && next.roles[id] !== patch.role) {
    if (patch.role !== "gallery") for (const key of next.order) if (next.roles[key] === patch.role) next.roles[key] = "gallery";
    next.roles[id] = patch.role; next.comparisonConfirmed = false;
  }
  if (patch.cover) next.coverId = id;
  if (patch.move) { const index = next.order.indexOf(id); const target = index + (patch.move === "up" ? -1 : 1); if (index >= 0 && target >= 0 && target < next.order.length) [next.order[index], next.order[target]] = [next.order[target], next.order[index]]; }
  if (patch.comparisonConfirmed !== undefined) next.comparisonConfirmed = patch.comparisonConfirmed;
  return readGalleryManifest(next, assets);
}

export function galleryAssets(assets: StoredAsset[], value: unknown, title: string): GalleryAsset[] {
  const manifest = readGalleryManifest(value, assets);
  return manifest.order.flatMap(id => { const asset = assets.find(item => item.id === id); return asset ? [{ id, url: asset.url, alt: asset.alt || asset.title || title, kind: asset.kind, role: manifest.roles[id], cover: id === manifest.coverId }] : []; });
}

// Read-only compatibility for the three original imports. Keep company edits and
// source records intact; remove their former provenance copy from public fields.
function inspirationText(value: string) {
  return value
    .replace(/projet fictif\s*[-\u00b7\u2013]\s*images g[\u00e9e]n[\u00e9e]r[\u00e9e]es?\.?\s*(?:ce n['\u2019]est pas un chantier A2E\.?)?\s*/gi, "")
    .replace(/image g[\u00e9e]n[\u00e9e]r[\u00e9e]e,\s*projet fictif\s*:\s*/gi, "Inspiration de renovation : ")
    .replace(/\s*\(images? g[\u00e9e]n[\u00e9e]r[\u00e9e]es?\)/gi, "")
    .replace(/\bprojets? fictifs?\b/gi, "Inspiration")
    .replace(/\bimages? g[\u00e9e]n[\u00e9e]r[\u00e9e]es?\b/gi, "")
    .replace(/(?:ce n['\u2019]est pas|pas) un chantier A2E\.?/gi, "")
    .replace(/avant imagin[\u00e9e]/gi, "avant envisage")
    .replace(/apr[\u00e8e]s imagin[\u00e9e]/gi, "apres projete")
    .trim();
}

export function toGalleryProject(item: { id: string; title: string; city: string; type: string; description: string; duration: string; budget: string; tags: string[]; active?: boolean; media: StoredAsset[]; photos: { beforeUrl: string | null; afterUrl: string | null }[]; galleryManifest?: unknown }): GalleryProject {
  const inspiration = item.id.startsWith("demo-realisation-");
  const curatedInspiration = isGeneratedDemoProject(item.id);
  const manifest = readGalleryManifest(item.galleryManifest, item.media);
  const title = curatedInspiration ? inspirationText(item.title) : item.title;
  const media = curatedInspiration ? item.media.map(asset => ({ ...asset, title: inspirationText(asset.title || ""), alt: inspirationText(asset.alt || "") })) : item.media;
  const assets = galleryAssets(media, manifest, title);
  const comparisons: GalleryComparison[] = [];
  const before = assets.find(asset => asset.role === "before"), after = assets.find(asset => asset.role === "after");
  if ((!inspiration || curatedInspiration) && manifest.comparisonConfirmed && before && after) comparisons.push(curatedInspiration
    ? { before, after, label: "Une intention de renovation", beforeLabel: "Avant envisag\u00e9", afterLabel: "Apr\u00e8s projet\u00e9" }
    : { before, after, label: "La transformation" });
  item.photos.forEach((photo, index) => {
    const beforeAsset = photo.beforeUrl ? { url: photo.beforeUrl, alt: `${inspiration ? "Avant envisage" : "Avant travaux"} - ${title}`, kind: "image", role: "before" as const } : null;
    const afterAsset = photo.afterUrl ? { url: photo.afterUrl, alt: `${inspiration ? "Apres projete" : "Après travaux"} - ${title}`, kind: "image", role: "after" as const } : null;
    for (const asset of [beforeAsset, afterAsset]) if (asset && !assets.some(existing => existing.url === asset.url)) assets.push(asset);
    if (!inspiration && beforeAsset && afterAsset && beforeAsset.url !== afterAsset.url && !comparisons.some(pair => pair.before.url === beforeAsset.url && pair.after.url === afterAsset.url)) comparisons.push({ before: beforeAsset, after: afterAsset, label: `Avant / après ${index + 1}` });
  });
  const description = curatedInspiration ? inspirationText(item.description) : item.description;
  const tags = curatedInspiration ? item.tags.filter(tag => !/^(projet fictif|images g[\u00e9e]n[\u00e9e]r[\u00e9e]es?)$/i.test(tag.trim())).map(inspirationText).filter(Boolean) : item.tags;
  return { id: item.id, title, city: item.city, type: item.type, description, duration: inspiration ? "" : item.duration, budget: inspiration ? "" : item.budget, tags, inspiration, published: item.active, assets, comparisons };
}
