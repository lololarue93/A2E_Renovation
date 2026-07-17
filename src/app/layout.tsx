import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import "./globals.css";
import { siteSettings } from "@/lib/site-data";
import { AnalyticsTracker } from "@/components/analytics/AnalyticsTracker";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://a2e-renovation.local"),
  applicationName: "A2E Renovation",
  verification: process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : undefined,
  icons: {
    icon: [{ url: "/branding/a2e-logo.jpeg", type: "image/jpeg" }],
    shortcut: "/branding/a2e-logo.jpeg",
    apple: [{ url: "/branding/a2e-logo.jpeg", type: "image/jpeg" }]
  },
  title: {
    default: "A2E Rénovation | Rénovation énergétique, fenêtres & isolation",
    template: "%s | A2E Rénovation"
  },
  description: "Fenêtres, isolation, plomberie, électricité et rénovation globale en Île-de-France. Obtenez une première fourchette claire en quelques minutes.",
  openGraph: {
    title: "A2E Rénovation",
    description: "Une estimation lisible, des postes détaillés et un accompagnement humain pour vos travaux en Île-de-France.",
    type: "website",
    locale: "fr_FR",
    siteName: "A2E Renovation",
    url: "/",
    images: [{
      url: "/branding/a2e-exterior-premium.jpeg",
      width: 1440,
      height: 1080,
      alt: "Projet de rénovation extérieure A2E Renovation"
    }]
  },
  twitter: {
    card: "summary_large_image",
    title: "A2E Renovation | Estimez vos travaux",
    description: "Une première fourchette claire avant votre rendez-vous technique.",
    images: ["/branding/a2e-exterior-premium.jpeg"]
  }
};

const nav = [
  ["Services", "/services/remplacement-fenetres"],
  ["Réalisations", "/realisations"],
  ["Simulateur", "/simulateur"],
  ["Équipe", "/equipe"],
  ["Aides", "/aides"],
  ["Contact", "/contact"]
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <AnalyticsTracker />
        <header className="sticky top-0 z-50 border-b border-navy/10 bg-white/95 text-navy shadow-[0_8px_28px_rgba(5,22,55,0.05)] backdrop-blur">
          <div className="container flex min-h-16 items-center justify-between gap-4">
            <Link href="/" className="flex min-h-11 items-center gap-3 font-black tracking-wide" aria-label="Accueil A2E Rénovation">
              <span className="a2e-logo-panel relative h-12 w-[5.4rem] overflow-hidden rounded-card">
                <Image src="/branding/a2e-logo.jpeg" alt="Logo A2E Rénovation" fill sizes="86px" className="object-contain p-1.5" priority />
              </span>
              <span className="hidden leading-tight sm:block">{siteSettings.company}</span>
            </Link>
            <nav className="hidden items-center gap-6 text-sm font-semibold text-ink/72 lg:flex">
              {nav.map(([label, href]) => (
                <Link key={href} href={href} className="transition hover:text-navy">
                  {label}
                </Link>
              ))}
            </nav>
            <Link href="/simulateur" data-track="quote_started" data-track-label="Header - Estimer mon projet" className="hidden min-h-11 items-center rounded-card bg-navy px-4 text-sm font-extrabold text-white transition hover:bg-[#0b244f] md:inline-flex">
              Estimer mon projet
            </Link>
          </div>
          <nav className="container flex gap-2 overflow-x-auto pb-3 text-sm font-bold text-ink/68 lg:hidden" aria-label="Navigation mobile">
            {nav.slice(0, 5).map(([label, href]) => (
              <Link key={href} href={href} className="shrink-0 rounded-card border border-navy/10 bg-white px-3 py-2">
                {label}
              </Link>
            ))}
          </nav>
        </header>
        {children}
        <Link href="/simulateur" className="mobile-estimate">
          Estimer mon projet
        </Link>
        <footer className="bg-navy py-12 text-white">
          <div className="container grid gap-8 md:grid-cols-[1.3fr_1fr_1fr]">
            <div>
              <A2EVisualSignature compact />
              <p className="mt-5 max-w-xl text-sm leading-7 text-white/72">
                Pré-devis indicatif, accompagnement rénovation énergétique et suivi de chantier en Île-de-France.
              </p>
            </div>
            <div className="text-sm leading-7 text-white/78">
              <strong className="text-white">Contact</strong>
              <p><a href={`tel:${siteSettings.phone.replaceAll(" ", "")}`}>{siteSettings.phone}</a></p>
              <p><a href={`mailto:${siteSettings.email}`}>{siteSettings.email}</a></p>
              <p>Réseaux : {siteSettings.social}</p>
            </div>
            <div className="text-sm leading-7 text-white/78">
              <strong className="text-white">Informations</strong>
              <p><Link href="/mentions-legales">Mentions légales</Link></p>
              <p><Link href="/politique-confidentialite">Confidentialité</Link></p>
              <p className="pt-2 text-xs">Certifications et qualifications à confirmer selon les informations légales et administratives de l'entreprise.</p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}

function A2EVisualSignature({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`${compact ? "h-12 w-[5.5rem]" : "h-16 w-[7rem]"} a2e-logo-panel relative overflow-hidden rounded-card`}>
        <Image src="/branding/a2e-logo.jpeg" alt="Logo A2E Rénovation" fill sizes={compact ? "88px" : "112px"} className="object-contain p-1.5" />
      </div>
      <div>
        <p className="font-black">{siteSettings.company}</p>
        <p className="text-sm text-white/65">Rénovation premium & accompagnement travaux</p>
      </div>
    </div>
  );
}
