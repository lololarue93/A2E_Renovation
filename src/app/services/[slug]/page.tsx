import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Estimator } from "@/components/calculators/Estimator";
import { SectionHeading } from "@/components/marketing/SectionHeading";
import { TrustBadges } from "@/components/trust/TrustBadges";
import { services, siteSettings } from "@/lib/site-data";

export function generateStaticParams() {
  return services.map((service) => ({ slug: service.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const service = services.find((item) => item.slug === params.slug);
  return {
    title: service?.title ?? "Services",
    description: service?.excerpt ?? siteSettings.description
  };
}

export default function ServicePage({ params }: { params: { slug: string } }) {
  const service = services.find((item) => item.slug === params.slug);
  if (!service) notFound();
  return (
    <main>
      <section className="photo-hero py-20 text-white">
        <div className="container">
          <p className="font-black uppercase tracking-[.18em] text-champagne">Service A2E</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-black md:text-6xl">{service.title}</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-white/75">{service.excerpt}</p>
          <Link href="/simulateur" className="mt-8 inline-flex rounded-card bg-champagne px-6 py-4 font-black text-navy">Estimer ce projet</Link>
        </div>
      </section>
      <section className="section">
        <div className="container grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
          <div>
            <SectionHeading eyebrow="Méthode" title="Un cadrage clair avant devis définitif" text="Chaque projet part d'une qualification simple: logement, surface, contraintes d'accès, niveau de finition, urgence et objectifs de performance." />
          </div>
          <div className="grid gap-4">
            {service.bullets.map((item) => <div className="a2e-card p-5 font-bold text-navy" key={item}>{item}</div>)}
          </div>
        </div>
      </section>
      <section className="section-tight bg-white">
        <div className="container">
          <SectionHeading eyebrow="Pack d'installation" title="Ce qui justifie la fourchette" text="Le prix ne dépend pas seulement d'un matériau. Il varie selon le métré, la dépose, les reprises, l'accès, les finitions et le niveau de préparation demandé." />
          <div className="mt-6 grid gap-4 md:grid-cols-4">
            {service.packs.map((item) => (
              <div key={item} className="rounded-card border border-navy/10 bg-pearl p-4 font-black text-navy">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="section photo-wash">
        <div className="container">
          <SectionHeading eyebrow="Estimation" title={`Simuler un projet ${service.title.toLowerCase()}`} />
          <Estimator />
        </div>
      </section>
      <section className="section-tight">
        <div className="container"><TrustBadges /></div>
      </section>
    </main>
  );
}
