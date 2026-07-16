import type { Metadata } from "next";
import { SectionHeading } from "@/components/marketing/SectionHeading";
import { TrustBadges } from "@/components/trust/TrustBadges";

export const metadata: Metadata = {
  title: "Aides & accompagnement",
  description: "Accompagnement indicatif A2E Rénovation sur les aides à la rénovation énergétique."
};

export default function AidesPage() {
  return (
    <main>
      <section className="photo-hero py-20 text-white">
        <div className="container">
          <p className="font-black uppercase tracking-[.16em] text-champagne">Accompagnement</p>
          <h1 className="mt-4 text-4xl font-black md:text-6xl">Aides & dossier travaux</h1>
          <p className="mt-5 max-w-2xl text-white/76">A2E aide à structurer le dossier, sans garantir l'obtention des aides qui dépend des critères officiels et de la situation du foyer.</p>
        </div>
      </section>
      <section className="section photo-wash">
        <div className="container">
          <SectionHeading eyebrow="Prudence" title="Un accompagnement sérieux, des mentions claires" text="Certifications et qualifications à confirmer selon les informations légales et administratives de l'entreprise. Les aides potentielles restent indicatives et non garanties." />
          <TrustBadges />
        </div>
      </section>
    </main>
  );
}
