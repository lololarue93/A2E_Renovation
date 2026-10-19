import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ProjectGallery } from "@/components/marketing/ProjectGallery";
import { getPublicRealisations } from "@/lib/realisations/catalog";
import { toGalleryProject } from "@/lib/realisations/gallery";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Réalisations, avant / après & inspirations", description: "Explorez les chantiers publiés par A2E, leurs photos avant/après et des inspirations clairement identifiées pour votre rénovation en Île-de-France." };

export default async function RealisationsPage() {
  const catalog = await getPublicRealisations();
  const projects = catalog.map(toGalleryProject);
  return <main id="main-content"><section className="page-heading"><div className="container"><p className="eyebrow">Réalisations / Avant & après / Inspirations</p><h1>Regarder les détails.<br />Imaginer la suite.</h1><p>Des photos à parcourir, des transformations à comparer et des idées à explorer. Chaque chantier publié se distingue clairement des projets fictifs aux images générées.</p><Link href="/simulateur" className="button-text">Donner forme à mon projet <ArrowUpRight size={17} /></Link></div></section><section className="section"><div className="container"><ProjectGallery projects={projects} /></div></section><section className="project-invitation"><div className="container"><h2>Une idée vous plaît ?<br />Parlons de votre habitat.</h2><Link href="/simulateur" className="button-light" data-track="gallery_estimate_clicked" data-track-label="inspiration">Composer mon estimation <ArrowUpRight size={18} /></Link></div></section></main>;
}
