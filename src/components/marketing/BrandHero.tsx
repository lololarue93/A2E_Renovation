import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUpRight, Phone, MoveUpRight } from "lucide-react";
import { getSiteContactSettings } from "@/lib/settings/site-contact-settings";

export async function BrandHero() {
  const contact = await getSiteContactSettings();
  return <section className="atelier-hero">
    <div className="container hero-grid">
      <div className="hero-copy">
        <p className="eyebrow"><span className="status-dot" /> Rénovation en Île-de-France</p>
        <h1>Votre habitat.<br />De nouvelles<br /><span>possibilités.</span></h1>
        <p className="hero-intro">Des espaces qui vous ressemblent. Des travaux pensés dans le détail. Un budget clair, avant de commencer.</p>
        <div className="hero-actions">
          <Link href="/simulateur" className="button-primary" data-track="cta_click" data-track-label="Accueil - Composer mon projet">Composer mon projet <ArrowUpRight size={19} /></Link>
          <a href={`tel:${contact.phone.replace(/[^+\d]/g, "")}`} className="button-text" data-track="phone_click" data-track-label="Accueil - Parlons-en"><Phone size={16} /> Parlons-en</a>
        </div>
        <div className="hero-note"><span>MENUISERIES</span><span>ISOLATION</span><span>INTÉRIEURS</span></div>
      </div>
      <div className="hero-visual">
        <Image src="/branding/a2e-hero-renovation.png" alt="Intérieur lumineux en cours de rénovation, inspiration d'aménagement" fill sizes="(max-width: 1023px) 100vw, 58vw" priority className="object-cover" />
        <span className="image-caption">INSPIRATION · L’ART DE TRANSFORMER</span>
        <Link href="/realisations" className="hero-photo-link" aria-label="Découvrir la galerie"><MoveUpRight size={22} /></Link>
        <div className="hero-project-tag"><span className="tag-rule" /><p>Du premier croquis<br /><strong>aux dernières finitions.</strong></p></div>
      </div>
    </div>
    <div className="container hero-bottom"><a href="#expertises" className="button-text"><ArrowDown size={15} /> Explorer nos expertises</a><p>Un projet bien pensé commence par une conversation.</p><span>01 / A2E</span></div>
  </section>;
}
