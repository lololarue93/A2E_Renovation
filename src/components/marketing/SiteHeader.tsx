"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Menu, X, Phone } from "lucide-react";

const nav = [["Expertises", "/services"], ["Galerie", "/realisations"], ["Prix", "/tarifs"], ["Notre équipe", "/equipe"], ["Accompagnement", "/aides"], ["Contact", "/contact"]];
export function SiteHeader({ phone }: { phone: string }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  return <><a className="skip-link" href="#main-content">Aller au contenu</a><header className="site-header"><div className="container header-inner"><Link href="/" className="brand" aria-label="A2E Rénovation, accueil" onClick={() => setOpen(false)}><Image src="/branding/a2e-logo.jpeg" alt="A2E" width={83} height={47} priority /><span>RÉNOVATION<span>Penser. Transformer. Habiter.</span></span></Link><nav aria-label="Navigation principale" className="desktop-nav">{nav.map(([label, href]) => <Link href={href} key={href} aria-current={path.startsWith(href) ? "page" : undefined}>{label}</Link>)}</nav><div className="header-actions"><Link href="/simulateur" className="header-cta" data-track="cta_click" data-track-label="En-tete">Mon projet <ArrowUpRight size={16} /></Link><button type="button" className="menu-toggle" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="mobile-nav" aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}>{open ? <X /> : <Menu />}</button></div></div>{open && <nav id="mobile-nav" className="mobile-nav container" aria-label="Navigation mobile">{nav.map(([label, href]) => <Link key={href} href={href} onClick={() => setOpen(false)}>{label}<ArrowUpRight size={18} /></Link>)}<a href={`tel:${phone.replace(/[^+\d]/g, "")}`}><Phone size={17} /> {phone}</a><Link href="/admin" onClick={() => setOpen(false)}>Espace équipe <ArrowUpRight size={18} /></Link></nav>}</header></>;
}
