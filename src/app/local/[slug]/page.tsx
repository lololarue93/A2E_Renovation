import type { Metadata } from "next";
import Link from "next/link";

const titles: Record<string, string> = {
  "renovation-energetique-ile-de-france": "Renovation energetique en Ile-de-France",
  "remplacement-fenetres-ile-de-france": "Remplacement fenetres en Ile-de-France",
  "isolation-thermique-exterieure-seine-saint-denis": "Isolation thermique exterieure en Seine-Saint-Denis",
  "renovation-globale-ile-de-france": "Renovation globale en Ile-de-France",
  "renovation-maison-seine-saint-denis": "Renovation maison en Seine-Saint-Denis"
};

export function generateStaticParams() {
  return Object.keys(titles).map((slug) => ({ slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  return { title: titles[params.slug] ?? "Renovation locale A2E" };
}

export default function LocalPage({ params }: { params: { slug: string } }) {
  return (
    <main className="section">
      <div className="container max-w-3xl">
        <p className="font-black uppercase tracking-[.18em] text-champagne">Zone d'intervention</p>
        <h1 className="mt-4 text-4xl font-black text-navy">{titles[params.slug] ?? "Renovation A2E en Ile-de-France"}</h1>
        <p className="mt-6 leading-7 text-ink/70">A2E Renovation intervient dans toute l'Ile-de-France, avec une proximite renforcee en Seine-Saint-Denis, Seine-et-Marne et Val-d'Oise. Chaque projet est confirme apres echange et visite technique.</p>
        <Link href="/simulateur" className="mt-8 inline-flex rounded-card bg-navy px-5 py-3 font-black text-white">Estimer mon projet</Link>
      </div>
    </main>
  );
}
