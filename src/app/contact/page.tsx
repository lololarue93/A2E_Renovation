import type { Metadata } from "next";
import Link from "next/link";
import { siteSettings } from "@/lib/site-data";
import { PhoneQrCard } from "@/components/marketing/PhoneQrCard";
import { SocialLinks } from "@/components/marketing/SocialLinks";
import { getSiteContactSettings } from "@/lib/settings/site-contact-settings";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contactez A2E Rénovation pour un projet de fenêtres, isolation, rénovation énergétique ou rénovation globale."
};

export default async function ContactPage() {
  const contact = await getSiteContactSettings();
  return (
    <main>
      <section className="photo-hero py-20 text-white">
        <div className="container">
          <p className="font-black uppercase tracking-[.16em] text-champagne">Contact</p>
          <h1 className="mt-4 text-4xl font-black md:text-6xl">Parler de votre projet</h1>
          <p className="mt-5 text-white/76">{siteSettings.phone} · {siteSettings.email}</p>
        </div>
      </section>
      <section className="section premium-surface">
        <div className="container grid gap-6 lg:grid-cols-[.85fr_1.15fr]">
          <div className="a2e-card bg-white/95 p-7">
            <h2 className="text-2xl font-black text-navy">Coordonnées</h2>
            <p className="mt-4"><strong>Président :</strong> {siteSettings.president}</p>
            <p><strong>Téléphone :</strong> {contact.phone}</p>
            <p><strong>Email :</strong> {siteSettings.email}</p>
            <p><strong>Réseaux :</strong> {siteSettings.social}</p>
            <div className="mt-5"><SocialLinks /></div>
          </div>
          <div className="a2e-card p-7">
            <h2 className="text-2xl font-black text-navy">Démarrer avec une première fourchette</h2>
            <p className="mt-3 text-ink/66">Le simulateur crée un dossier projet plus qualifié qu'un simple message de contact : poste concerné, dimensions, niveau de finition et budget indicatif.</p>
            <Link href="/simulateur" className="mt-6 inline-flex rounded-card bg-navy px-5 py-3 font-black text-white">Estimer mon projet</Link>
          </div>
        </div>
        <div className="container mt-6"><PhoneQrCard /></div>
      </section>
    </main>
  );
}
