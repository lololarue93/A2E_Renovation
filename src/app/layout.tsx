import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import "./globals.css";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { ArrowUpRight } from "lucide-react";
import { siteSettings } from "@/lib/site-data";
import { AnalyticsTracker } from "@/components/analytics/AnalyticsTracker";
import { AnalyticsPreferenceButton } from "@/components/analytics/AnalyticsPreferences";
import { SocialLinks } from "@/components/marketing/SocialLinks";
import { getSiteContactSettings } from "@/lib/settings/site-contact-settings";

export const dynamic = "force-dynamic";

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
      alt: "Inspiration de rénovation extérieure, illustration A2E"
    }]
  },
  twitter: {
    card: "summary_large_image",
    title: "A2E Renovation | Estimez vos travaux",
    description: "Une première fourchette claire avant votre rendez-vous technique.",
    images: ["/branding/a2e-exterior-premium.jpeg"]
  }
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const contact = await getSiteContactSettings();
  return <html lang="fr"><body><AnalyticsTracker /><SiteHeader phone={contact.phone} />{children}
    <footer className="site-footer"><div className="container"><div className="footer-grid">
      <div><Link href="/" className="brand"><Image src="/branding/a2e-logo.jpeg" alt="Logo A2E Rénovation" width={83} height={47} /><span>RÉNOVATION<span>Penser. Transformer. Habiter.</span></span></Link><p>Votre partenaire pour repenser votre habitat, poste par poste, en Île-de-France.</p><SocialLinks /></div>
      <div><h3>Parlons de votre projet</h3><a href={`tel:${contact.phone.replace(/[^+\d]/g, "")}`}>{contact.phone}</a><a href={`mailto:${siteSettings.email}`}>{siteSettings.email}</a><p>Île-de-France<br />Seine-et-Marne · Seine-Saint-Denis · Val-d’Oise</p></div>
      <div><h3>Explorer A2E</h3><Link href="/services">Nos expertises</Link><Link href="/realisations">Galerie & inspirations</Link><Link href="/simulateur">Estimer mes travaux</Link><Link href="/tarifs">Repères de prix</Link><Link href="/equipe">Notre équipe</Link><Link href="/admin">Espace équipe <ArrowUpRight size={13} className="inline" /></Link></div>
    </div><div className="footer-bottom"><span>© {new Date().getFullYear()} {siteSettings.company}</span><div className="flex flex-wrap gap-5"><Link href="/mentions-legales">Mentions légales</Link><Link href="/politique-confidentialite">Confidentialité</Link><AnalyticsPreferenceButton /></div><span>Conçu pour vos projets. Pensé dans le détail.</span></div></div></footer>
  </body></html>;
}
