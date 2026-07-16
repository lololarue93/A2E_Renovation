import type { Metadata } from "next";
import { Estimator } from "@/components/calculators/Estimator";
import { SectionHeading } from "@/components/marketing/SectionHeading";

export const metadata: Metadata = {
  title: "Simulateur travaux",
  description: "Estimez votre projet de rénovation énergétique, fenêtres, isolation ou rénovation globale avec A2E Rénovation."
};

export default function SimulatorPage() {
  return (
    <main>
      <section className="photo-hero py-20 text-white">
        <div className="container">
          <p className="font-black uppercase tracking-[.16em] text-champagne">Pré-devis indicatif</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-black leading-tight md:text-6xl">Simulateur travaux A2E Rénovation</h1>
          <p className="mt-5 max-w-2xl text-white/75">Répondez aux questions essentielles et recevez une première estimation PDF.</p>
        </div>
      </section>
      <section className="section premium-surface">
        <div className="container">
          <SectionHeading eyebrow="Tunnel mobile-first" title="Votre projet, vos contraintes, votre fourchette" />
          <Estimator />
        </div>
      </section>
    </main>
  );
}
