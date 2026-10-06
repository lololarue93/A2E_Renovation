import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Check, Layers3, Ruler, FileText } from "lucide-react";
import { BrandHero } from "@/components/marketing/BrandHero";
import { QuickEstimate } from "@/components/calculators/QuickEstimate";
import { services } from "@/lib/site-data";

const steps = [
  ["01", "Vous imaginez.", "Vos envies, vos priorités et les contraintes de votre logement."],
  ["02", "Nous chiffrons.", "Une première enveloppe expliquée, puis un devis après visite technique."],
  ["03", "Nous transformons.", "Les lots coordonnés, un interlocuteur identifié et des finitions suivies."]
];

export default function HomePage() {
  return <main id="main-content">
    <BrandHero />
    <div className="assurance-strip"><div className="container"><span><Ruler size={19} /> Un chiffrage poste par poste</span><span><Layers3 size={19} /> Plusieurs travaux, un seul projet</span><span><FileText size={19} /> Un pré-devis détaillé</span><span><Check size={19} /> Un accompagnement humain</span></div></div>
    <section className="section" id="expertises"><div className="container">
      <div className="section-intro"><div><p className="eyebrow">01 / Nos expertises</p><h2>Chaque détail compte.<br />Chaque métier aussi.</h2></div><div><p>Une fenêtre à remplacer, une maison à repenser. Nous composons les bons savoir-faire autour de votre projet.</p><Link className="button-text" href="/services">Toutes nos expertises <ArrowUpRight size={17} /></Link></div></div>
      <div className="expertise-grid">{services.slice(0, 4).map((service, index) => <Link key={service.slug} href={`/services/${service.slug}`} className="expertise-item"><div className="expertise-top"><service.icon size={29} strokeWidth={1.25} /><span>0{index + 1}</span></div><h3>{service.title}</h3><p>{service.bullets[0]}. {service.bullets[1]}.</p><span className="expertise-link">Découvrir <ArrowUpRight size={18} /></span></Link>)}</div>
    </div></section>
    <section className="section estimate-section"><div className="container"><div className="section-intro"><div><p className="eyebrow">02 / Votre budget, en clair</p><h2>Passer de l’idée<br />à une première estimation.</h2></div><p>Choisissez un poste pour explorer votre budget. Composez ensuite tous vos travaux, leurs dimensions et leurs options dans le simulateur.</p></div><QuickEstimate /></div></section>
    <section className="section"><div className="container inspiration-grid"><div className="inspiration-photo"><Image src="/branding/a2e-exterior-premium.jpeg" alt="Inspiration de façade contemporaine avec menuiseries, bois et terrasse" fill sizes="(max-width: 767px) 100vw, 50vw" className="object-cover" /><span className="image-caption">INSPIRATION · EXTÉRIEURS</span></div><div className="inspiration-copy"><p className="eyebrow">03 / Voir plus loin</p><h2>Le beau se voit.<br />Le soin se ressent.</h2><p>Lumière, matières, confort. Parcourez la galerie pour explorer les possibilités et les projets publiés par notre équipe.</p><Link href="/realisations" className="button-primary">Explorer la galerie <ArrowUpRight size={18} /></Link><span className="fine-print">Les visuels d’inspiration sont identifiés dans la galerie.</span></div></div></section>
    <section className="section method-section"><div className="container"><div className="section-intro"><div><p className="eyebrow">04 / La méthode A2E</p><h2>Du projet à la réalité.<br />En toute clarté.</h2></div><Link href="/equipe" className="button-text">Rencontrer l’équipe <ArrowUpRight size={17} /></Link></div><div className="method-grid">{steps.map(([n, title, text]) => <div key={n}><span>{n}</span><h3>{title}</h3><p>{text}</p></div>)}</div></div></section>
    <section className="project-invitation"><div className="container"><div><p className="eyebrow">Et si on commençait ?</p><h2>Faisons place<br />à votre projet.</h2></div><Link href="/simulateur" className="button-light" data-track="cta_click" data-track-label="Accueil - CTA final">Estimer mes travaux <ArrowUpRight size={20} /></Link></div></section>
  </main>;
}
