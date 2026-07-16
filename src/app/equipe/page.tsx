import type { Metadata } from "next";
import { SectionHeading } from "@/components/marketing/SectionHeading";
import { TeamGrid } from "@/components/team/TeamGrid";

export const metadata: Metadata = {
  title: "Notre équipe",
  description: "Découvrez l'équipe A2E Rénovation : conseil, conduite de travaux et relation client."
};

export default function TeamPage() {
  return (
    <main>
      <section className="photo-hero py-20 text-white">
        <div className="container">
          <p className="font-black uppercase tracking-[.16em] text-champagne">Équipe A2E</p>
          <h1 className="mt-4 text-4xl font-black md:text-6xl">Des interlocuteurs identifiés</h1>
          <p className="mt-5 max-w-2xl text-white/76">Un projet rassurant commence par des personnes claires : conseil, suivi, chiffrage et conduite de chantier.</p>
        </div>
      </section>
      <section className="section photo-wash">
        <div className="container">
          <SectionHeading eyebrow="Humain" title="Une équipe pensée pour rassurer chaque client" />
          <TeamGrid />
        </div>
      </section>
    </main>
  );
}
