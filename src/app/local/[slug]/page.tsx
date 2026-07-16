import type { Metadata } from "next";
import Link from "next/link";

const titles: Record<string, string> = {
  "renovation-energetique-sevran": "Rénovation énergétique à Sevran",
  "remplacement-fenetres-sevran": "Remplacement fenêtres à Sevran",
  "isolation-thermique-exterieure-seine-saint-denis": "Isolation thermique extérieure en Seine-Saint-Denis",
  "renovation-globale-ile-de-france": "Rénovation globale en Île-de-France",
  "renovation-maison-seine-saint-denis": "Rénovation maison en Seine-Saint-Denis"
};

export function generateStaticParams() {
  return Object.keys(titles).map((slug) => ({ slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  return { title: titles[params.slug] ?? "Rénovation locale A2E" };
}

export default function LocalPage({ params }: { params: { slug: string } }) {
  return (
    <main className="section">
      <div className="container max-w-3xl">
        <p className="font-black uppercase tracking-[.18em] text-champagne">SEO local</p>
        <h1 className="mt-4 text-4xl font-black text-navy">{titles[params.slug] ?? "Rénovation locale A2E"}</h1>
        <p className="mt-6 leading-7 text-ink/70">Page locale démonstration prête à enrichir avec des réalisations, FAQ, zones desservies et contenus SEO spécifiques.</p>
        <Link href="/simulateur" className="mt-8 inline-flex rounded-card bg-navy px-5 py-3 font-black text-white">Estimer mon projet</Link>
      </div>
    </main>
  );
}
