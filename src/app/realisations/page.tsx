import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ProjectGallery, type GalleryProject } from "@/components/marketing/ProjectGallery";
import { getPublicRealisations } from "@/lib/realisations/catalog";
import { toGalleryProject } from "@/lib/realisations/gallery";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Réalisations, avant / après & inspirations", description: "Explorez les chantiers publiés par A2E, leurs photos avant/après et des inspirations clairement identifiées pour votre rénovation en Île-de-France." };

export default async function RealisationsPage() {
  const catalog = await getPublicRealisations();
  const projects = catalog.map(toGalleryProject);
  const inspirations: GalleryProject[] = [
    { id: "demonstration-room", title: "Une pièce, deux intentions.", city: "Exemple illustré", type: "Démonstration", description: "Une même pièce dessinée avant et après un projet fictif : essayez le curseur et explorez les vues. Cette illustration présente le fonctionnement de la galerie ; ce n’est pas un chantier A2E.", duration: "", budget: "", tags: ["Avant / après", "Illustration", "Intérieur"], inspiration: true, assets: [{ url: "/branding/demo-piece-avant.svg", alt: "Démonstration illustrée : pièce fictive avant transformation", kind: "image", role: "before" }, { url: "/branding/demo-piece-apres.svg", alt: "Démonstration illustrée : projet fictif pour la même pièce", kind: "image", role: "after", cover: true }], comparisons: [{ label: "Exemple illustré", beforeLabel: "État initial", afterLabel: "Projet imaginé", before: { url: "/branding/demo-piece-avant.svg", alt: "Pièce fictive avant transformation", kind: "image" }, after: { url: "/branding/demo-piece-apres.svg", alt: "Projet fictif pour la même pièce", kind: "image" } }] },
    { id: "inspiration-interior", title: "Réinventer les volumes.", city: "Ambiance intérieure", type: "Inspirations", description: "La lumière naturelle, les matières chaleureuses et des espaces qui communiquent. Une piste pour imaginer votre intérieur, présentée comme inspiration.", duration: "", budget: "", tags: ["Intérieur", "Bois", "Lumière"], inspiration: true, assets: [{ url: "/branding/a2e-hero-renovation.png", alt: "Inspiration : un intérieur lumineux en cours de rénovation", kind: "image" }] },
    { id: "inspiration-exterior", title: "Ouvrir de nouvelles perspectives.", city: "Ambiance extérieure", type: "Inspirations", description: "Des menuiseries généreuses, une façade repensée et un lien avec le jardin. Un visuel d’inspiration pour transformer l’habitat.", duration: "", budget: "", tags: ["Façade", "Menuiseries", "Extérieur"], inspiration: true, assets: [{ url: "/branding/a2e-exterior-premium.jpeg", alt: "Inspiration : façade, menuiseries et terrasse contemporaine", kind: "image" }] }
  ];
  return <main id="main-content"><section className="page-heading"><div className="container"><p className="eyebrow">Réalisations / Avant & après / Inspirations</p><h1>Regarder les détails.<br />Imaginer la suite.</h1><p>Des photos à parcourir, des transformations à comparer et des idées à explorer. Chaque chantier publié se distingue clairement des visuels d’inspiration.</p><Link href="/simulateur" className="button-text">Donner forme à mon projet <ArrowUpRight size={17} /></Link></div></section><section className="section"><div className="container"><ProjectGallery projects={[...projects, ...inspirations]} /></div></section><section className="project-invitation"><div className="container"><h2>Une idée vous plaît ?<br />Parlons de votre habitat.</h2><Link href="/simulateur" className="button-light" data-track="gallery_estimate_clicked" data-track-label="inspiration">Composer mon estimation <ArrowUpRight size={18} /></Link></div></section></main>;
}
