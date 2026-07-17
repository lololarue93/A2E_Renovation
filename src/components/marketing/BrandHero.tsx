import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, ClipboardCheck, PhoneCall } from "lucide-react";
import { quickStats, siteSettings } from "@/lib/site-data";
import { getSiteContactSettings } from "@/lib/settings/site-contact-settings";

export async function BrandHero() {
  const contact = await getSiteContactSettings();
  return (
    <section className="photo-hero relative isolate overflow-hidden text-white">
      <Image
        src="/branding/a2e-exterior-premium.jpeg"
        alt="Réalisation extérieure premium par A2E Rénovation"
        fill
        priority
        sizes="100vw"
        className="absolute inset-0 -z-20 object-cover"
      />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(112deg,rgba(5,22,55,.96)_0%,rgba(5,22,55,.86)_48%,rgba(5,22,55,.54)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-32 bg-[linear-gradient(180deg,transparent,rgba(5,22,55,.42))]" />
      <div className="absolute left-0 top-0 -z-10 h-full w-2 bg-[linear-gradient(180deg,#051637,#b9aa8a,#051637)]" />

      <div className="container grid min-h-[calc(100vh-64px)] items-center gap-10 py-14 md:py-20 lg:grid-cols-[1.05fr_.95fr]">
        <div className="max-w-3xl">
          <div className="a2e-logo-panel relative mb-8 h-24 w-44 overflow-hidden rounded-card sm:h-28 sm:w-56">
            <Image src="/branding/a2e-logo.jpeg" alt="Logo A2E Rénovation" fill sizes="224px" className="object-contain p-3" priority />
          </div>

          <div className="mb-6 inline-flex max-w-full items-center gap-2 rounded-card border border-champagne/45 bg-white/95 px-3 py-2 text-sm font-bold text-navy shadow-[0_18px_48px_rgba(5,22,55,.16)] backdrop-blur">
            <BadgeCheck size={18} className="shrink-0 text-champagne" /> RGE Qualibat · Devis clair · Suivi chantier
          </div>

          <h1 className="max-w-4xl text-4xl font-black leading-[1.04] tracking-tight md:text-6xl">
            {siteSettings.tagline}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/82">
            {siteSettings.description}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link href="/simulateur" data-track="quote_started" data-track-label="Hero - Estimer mon projet" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-card bg-white px-6 font-extrabold text-navy shadow-[0_18px_48px_rgba(5,22,55,.2)] transition hover:-translate-y-0.5 hover:bg-pearl">
              Estimer mon projet <ArrowRight size={18} />
            </Link>
            <Link href={`tel:${contact.phone.replace(/[^+\d]/g, "")}`} data-track="phone_click" data-track-label="Hero - Appeler A2E" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-card border border-white/35 bg-white/12 px-6 font-bold text-white backdrop-blur transition hover:border-champagne hover:bg-white/18">
              <PhoneCall size={18} /> Appeler A2E
            </Link>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {quickStats.map((stat) => (
              <div key={stat.label} className="rounded-card border border-white/25 bg-white/90 p-4 text-navy shadow-[0_12px_34px_rgba(5,22,55,0.16)] backdrop-blur">
                <stat.icon className="mb-3 text-champagne" size={22} />
                <p className="text-xl font-black">{stat.label === "Contact direct" ? contact.phone : stat.value}</p>
                <p className="text-sm text-ink/60">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="justify-self-end lg:flex">
          <div className="relative max-w-md rounded-card border border-white/40 bg-white p-5 text-navy shadow-premium md:p-6">
            <div className="gold-line" />
            <p className="mt-5 text-sm font-black uppercase tracking-[.18em] text-champagne">Méthode A2E</p>
            <h2 className="mt-3 text-3xl font-black leading-tight">Un dossier travaux lisible avant le premier rendez-vous.</h2>
            <div className="mt-6 space-y-3 text-sm font-semibold text-ink/75">
              <p className="flex gap-2"><ClipboardCheck size={18} className="mt-0.5 shrink-0 text-champagne" /> Fourchette basse, moyenne et haute.</p>
              <p className="flex gap-2"><ClipboardCheck size={18} className="mt-0.5 shrink-0 text-champagne" /> Hypothèses visibles pour le client.</p>
              <p className="flex gap-2"><ClipboardCheck size={18} className="mt-0.5 shrink-0 text-champagne" /> Contact direct pour qualifier le chantier.</p>
            </div>
            <div className="mt-6 grid grid-cols-3 overflow-hidden rounded-card border border-ink/10 text-center text-xs font-black">
              <span className="bg-pearl p-3">Étude</span>
              <span className="border-x border-ink/10 bg-white p-3">Devis</span>
              <span className="bg-pearl p-3">Chantier</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
