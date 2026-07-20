import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { BrandHero } from "@/components/marketing/BrandHero";
import { SectionHeading } from "@/components/marketing/SectionHeading";
import { QuickEstimate } from "@/components/calculators/QuickEstimate";
import { TrustBadges } from "@/components/trust/TrustBadges";
import { reasons } from "@/lib/site-data";

const processSteps = [
  ["01", "Diagnostic", "Vos besoins, contraintes et priorités sont cadrés dès le premier échange."],
  ["02", "Fourchette", "Le simulateur donne un ordre de grandeur et rend les hypothèses visibles."],
  ["03", "Chiffrage", "L'équipe affine sur place et prépare le devis détaillé."],
  ["04", "Chantier", "Planning, interlocuteur identifié et suivi jusqu'aux finitions."]
];

const entryPoints = [
  ["Services", "/services", "Fenêtres, isolation, plomberie, électricité et chauffage."],
  ["Simulateur", "/simulateur", "Construisez plusieurs postes sur un même projet."],
  ["Réalisations", "/realisations", "Découvrez les projets et les finitions A2E."],
  ["Équipe", "/equipe", "Un échange humain pour valider les choix techniques."]
];

export default function HomePage() {
  return <main>
    <BrandHero />

    <section className="section">
      <div className="container">
        <SectionHeading eyebrow="Votre projet" title="Choisissez votre point de départ" text="Chaque spécialité dispose ensuite de sa page dédiée, de ses options et de sa calculette détaillée." />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {entryPoints.map(([label, href, text]) => <Link key={href} href={href} className="a2e-card group p-5 transition hover:-translate-y-0.5 hover:border-champagne"><p className="text-lg font-black text-navy">{label}</p><p className="mt-2 text-sm leading-6 text-ink/65">{text}</p><span className="mt-4 inline-flex items-center gap-2 text-sm font-black text-champagne">Découvrir <ArrowRight size={15} /></span></Link>)}
        </div>
      </div>
    </section>

    <section className="section premium-surface">
      <div className="container">
        <SectionHeading eyebrow="Simulateur" title="Une première fourchette avant le rendez-vous" text="Testez un poste en quelques secondes, puis affinez l'ensemble des travaux dans le simulateur complet." />
        <QuickEstimate />
      </div>
    </section>

    <section className="section">
      <div className="container">
        <div className="grid gap-8 lg:grid-cols-[.9fr_1.1fr] lg:items-start">
          <SectionHeading eyebrow="Méthode" title="Un parcours simple, lisible et traçable" text="Chaque projet est cadré, estimé, puis confirmé avec des hypothèses compréhensibles." />
          <div className="grid gap-3 sm:grid-cols-2">{processSteps.map(([number, title, text]) => <div key={number} className="a2e-card p-5"><p className="text-sm font-black text-champagne">{number}</p><h3 className="mt-2 text-xl font-black text-navy">{title}</h3><p className="mt-3 text-sm leading-6 text-ink/68">{text}</p></div>)}</div>
        </div>
      </div>
    </section>

    <section className="section bg-white">
      <div className="container">
        <SectionHeading eyebrow="Confiance" title="Pourquoi faire confiance à A2E ?" />
        <div className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]"><div className="a2e-card bg-navy p-7 text-white"><h3 className="text-2xl font-black">Des choix expliqués avant de décider</h3><p className="mt-4 leading-7 text-white/75">Matériaux, packs de pose, contraintes et fourchettes sont présentés clairement avant la visite technique.</p><Link href="/aides" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-card bg-white px-5 font-black text-navy">Voir l'accompagnement <ArrowRight size={16} /></Link></div><div className="grid gap-3 sm:grid-cols-2">{reasons.map((reason) => <div key={reason} className="rounded-card border border-navy/10 bg-pearl p-4 font-bold text-navy"><CheckCircle2 className="mb-3 text-champagne" size={20} />{reason}</div>)}</div></div>
        <div className="mt-8"><TrustBadges /></div>
      </div>
    </section>

    <section className="section photo-wash">
      <div className="container"><SectionHeading eyebrow="Réalisations" title="Des projets à découvrir, page par page" text="Retrouvez les photos, vidéos et détails des chantiers dans une galerie dédiée." /><div className="a2e-card flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between"><p className="max-w-2xl text-base leading-7 text-ink/70">Un contenu plus lisible pour prendre le temps de regarder les finitions et les solutions proposées.</p><Link href="/realisations" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-card bg-navy px-5 font-black text-white">Voir les réalisations <ArrowRight size={16} /></Link></div></div>
    </section>
  </main>;
}
