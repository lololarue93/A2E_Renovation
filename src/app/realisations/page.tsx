import type { Metadata } from "next";
import { RealisationsPreview } from "@/components/marketing/RealisationsPreview";
import { SectionHeading } from "@/components/marketing/SectionHeading";

export const metadata: Metadata = {
  title: "Réalisations avant/après",
  description: "Réalisations démonstration A2E Rénovation en fenêtres, isolation, rénovation globale, cuisine et salle de bain."
};

export default function RealisationsPage() {
  return (
    <main>
      <section className="photo-hero py-20 text-white">
        <div className="container">
          <p className="font-black uppercase tracking-[.16em] text-champagne">Avant / après</p>
          <h1 className="mt-4 text-4xl font-black md:text-6xl">Réalisations A2E</h1>
        </div>
      </section>
      <section className="section photo-wash">
        <div className="container">
          <SectionHeading eyebrow="Démonstration" title="6 projets prêts à remplacer par vos vrais chantiers" />
          <RealisationsPreview limit={6} />
        </div>
      </section>
    </main>
  );
}
