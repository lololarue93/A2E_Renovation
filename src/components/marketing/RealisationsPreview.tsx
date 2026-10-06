import { getPublicRealisations } from "@/lib/realisations/catalog";
import { ProjectGallery } from "./ProjectGallery";
import { toGalleryProject } from "@/lib/realisations/gallery";
export async function RealisationsPreview({ limit = 3 }: { limit?: number }) {
 const items = await getPublicRealisations();
 return <ProjectGallery projects={items.slice(0, limit).map(toGalleryProject)} />;
}
