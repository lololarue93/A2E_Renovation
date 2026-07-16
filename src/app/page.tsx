import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { BrandHero } from "@/components/marketing/BrandHero";
import { RealisationsPreview } from "@/components/marketing/RealisationsPreview";
import { SectionHeading } from "@/components/marketing/SectionHeading";
import { ServicesGrid } from "@/components/marketing/ServicesGrid";
import { Estimator } from "@/components/calculators/Estimator";
import { TeamGrid } from "@/components/team/TeamGrid";
import { TrustBadges } from "@/components/trust/TrustBadges";
import { reasons } from "@/lib/site-data";

const processSteps = [
  ["01", "Diagnostic", "Vos besoins, contraintes, logement et priorités sont cadrés dès le premier échange."],
  ["02", "Fourchette", "Le simulateur donne un ordre de grandeur et rend les hypothèses visibles."],
  ["03", "Chiffrage", "L'équipe affine sur place, conseille les aides possibles et prépare le devis."],
  ["04", "Chantier", "Planning, interlocuteur identifié et suivi jusqu'aux finitions."]
];

export default function HomePage() {
  return (
    <main>
      <BrandHero />

      <section className="section photo-wash">
        <div className="container">
          <SectionHeading
            eyebrow="Expertises"
            title="Des travaux énergétiques et globaux dans un parcours clair"
            text="A2E Rénovation regroupe les lots essentiels pour améliorer le confort, la performance et la valeur de votre bien."
          />
          <ServicesGrid />
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="grid gap-8 lg:grid-cols-[.9fr_1.1fr] lg:items-start">
            <SectionHeading
              eyebrow="Méthode"
              title="Un parcours simple, lisible et traçable"
              text="L'objectif n'est pas de vendre une promesse floue : chaque projet est cadré, estimé, puis confirmé avec des hypothèses compréhensibles."
            />
            <div className="grid gap-3 sm:grid-cols-2">
              {processSteps.map(([number, title, text]) => (
                <div key={number} className="a2e-card p-5">
                  <p className="text-sm font-black text-champagne">{number}</p>
                  <h3 className="mt-2 text-xl font-black text-navy">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-ink/68">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section premium-surface">
        <div className="container">
          <SectionHeading
            eyebrow="Simulateur"
            title="Obtenez une première fourchette avant le rendez-vous"
            text="Le simulateur qualifie le projet, calcule une estimation indicative et prépare un dossier lisible pour l'échange avec l'équipe A2E."
          />
          <Estimator />
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <SectionHeading eyebrow="Réalisations" title="Avant / après et projets démonstration" />
            <Link href="/realisations" className="inline-flex min-h-11 items-center gap-2 rounded-card border border-ink/15 px-4 font-black text-navy transition hover:border-champagne hover:text-champagne">
              Voir les projets <ArrowRight size={16} />
            </Link>
          </div>
          <RealisationsPreview />
        </div>
      </section>

      <section className="section bg-white">
        <div className="container">
          <SectionHeading eyebrow="Confiance" title="Pourquoi nous faire confiance ?" />
          <div className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
            <div className="a2e-card p-7">
              <h3 className="text-2xl font-black">RGE, Qualibat et accompagnement aides</h3>
              <p className="mt-4 leading-7 text-ink/70">
                Les badges sont prévus pour être activés ou désactivés depuis l'admin selon les confirmations légales et administratives de l'entreprise.
              </p>
              <Link href="/aides" className="mt-6 inline-flex min-h-11 items-center rounded-card bg-navy px-5 font-black text-white">
                Voir l'accompagnement
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {reasons.map((reason) => (
                <div key={reason} className="rounded-card border border-navy/10 bg-pearl p-4 font-bold text-navy">
                  <CheckCircle2 className="mb-3 text-champagne" size={20} />
                  {reason}
                </div>
              ))}
            </div>
          </div>
          <div className="mt-8"><TrustBadges /></div>
        </div>
      </section>

      <section className="section photo-wash">
        <div className="container">
          <SectionHeading eyebrow="Équipe" title="L'équipe A2E" />
          <TeamGrid />
        </div>
      </section>
    </main>
  );
}
