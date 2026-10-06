import { getPublicRealisations } from "@/lib/realisations/catalog";
import { ProjectGallery } from "./ProjectGallery";
export async function RealisationsPreview({ limit = 3 }: { limit?: number }) {
 const items = await getPublicRealisations();
 return <ProjectGallery projects={items.slice(0, limit).map(item => ({ ...item, inspiration: item.id.startsWith("demo-realisation-"), assets: item.media.map(a => ({url:a.url, alt:a.alt ?? item.title, kind:a.kind})) }))} />;
}
