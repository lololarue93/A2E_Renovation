import { ProjectGallery, type GalleryProject } from "@/components/marketing/ProjectGallery";
import { getPublicRealisations } from "@/lib/realisations/catalog";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Galerie & inspirations", description: "Explorez les projets publies par A2E et les inspirations de renovation en Ile-de-France." };

export default async function RealisationsPage() {
  const catalog = await getPublicRealisations();
  const projects: GalleryProject[] = catalog.map(item => ({ id: item.id, title: item.title, city: item.city, type: item.type, description: item.description, duration: item.duration, budget: item.budget, tags: item.tags, inspiration: item.id.startsWith("demo-realisation-"), assets: [
    ...item.photos.flatMap(photo => [{ url: photo.beforeUrl, alt: `Avant travaux - ${item.title}`, kind: "image" }, { url: photo.afterUrl, alt: `Apres travaux - ${item.title}`, kind: "image" }]).filter((p): p is { url: string; alt: string; kind: string } => Boolean(p.url)),
    ...item.media.map(asset => ({ url: asset.url, alt: asset.alt ?? item.title, kind: asset.kind }))
  ] }));
  const inspirations: GalleryProject[] = [
    { id: "inspiration-interior", title: "Réinventer les volumes.", city: "Ambiance intérieure", type: "Inspirations", description: "La lumière naturelle, les matières chaleureuses et des espaces qui communiquent. Une piste pour imaginer votre intérieur.", duration: "", budget: "", tags: ["Intérieur", "Bois", "Lumière"], inspiration: true, assets: [{ url: "/branding/a2e-hero-renovation.png", alt: "Inspiration : un intérieur lumineux en cours de rénovation", kind: "image" }] },
    { id: "inspiration-exterior", title: "Ouvrir de nouvelles perspectives.", city: "Ambiance extérieure", type: "Inspirations", description: "Des menuiseries généreuses, une façade repensée et un lien avec le jardin. Une inspiration pour transformer l’habitat.", duration: "", budget: "", tags: ["Façade", "Menuiseries", "Extérieur"], inspiration: true, assets: [{ url: "/branding/a2e-exterior-premium.jpeg", alt: "Inspiration : façade, menuiseries et terrasse contemporaine", kind: "image" }] }
  ];
  return <main id="main-content"><section className="page-heading"><div className="container"><p className="eyebrow">Galerie & inspirations</p><h1>Des idées à explorer.<br />Des détails à regarder.</h1><p>Les chantiers publiés par notre équipe et des visuels d’inspiration, clairement identifiés, pour donner forme à votre projet.</p></div></section><section className="section"><div className="container"><ProjectGallery projects={[...projects, ...inspirations]} /></div></section></main>;
}
