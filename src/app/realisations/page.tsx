import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ProjectGallery } from "@/components/marketing/ProjectGallery";
import { getPublicRealisations } from "@/lib/realisations/catalog";
import { toGalleryProject } from "@/lib/realisations/gallery";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Inspirations de rénovation & réalisations", description: "Matières, lumière et agencements : explorez des inspirations de rénovation et les réalisations publiées par A2E en Île-de-France." };

export default async function RealisationsPage() {
  const catalog = await getPublicRealisations();
  const projects = catalog.map(toGalleryProject);
  const hasRealisations = projects.some(project => !project.inspiration);
  return <main id="main-content"><section className="page-heading"><div className="container"><p className="eyebrow">{hasRealisations ? "Réalisations & inspirations" : "Inspirations de rénovation"}</p><h1>{hasRealisations ? <>Regarder les détails.<br />Imaginer la suite.</> : <>Des idées pour rénover.<br />Un intérieur à votre image.</>}</h1><p>{hasRealisations ? "Parcourez les chantiers publiés et explorez des intentions de rénovation : matières, lumière et agencements pour nourrir votre projet." : "La chaleur du bois, la lumière d’une pièce ouverte, les détails d’une salle d’eau. Explorez des intentions et imaginez leur place chez vous."}</p><Link href="/simulateur" className="button-text">Donner forme à mon projet <ArrowUpRight size={17} /></Link></div></section><section className="section"><div className="container"><ProjectGallery projects={projects} /></div></section><section className="project-invitation"><div className="container"><h2>Une idée vous plaît ?<br />Parlons de votre habitat.</h2><Link href="/simulateur" className="button-light" data-track="gallery_estimate_clicked" data-track-label="inspiration">Composer mon estimation <ArrowUpRight size={18} /></Link></div></section></main>;
}
