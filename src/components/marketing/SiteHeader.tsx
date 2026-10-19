"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Menu, X, Phone } from "lucide-react";

const nav = [["Expertises", "/services"], ["Galerie", "/realisations"], ["Prix", "/tarifs"], ["Notre équipe", "/equipe"], ["Accompagnement", "/aides"], ["Contact", "/contact"]];
export function SiteHeader({ phone }: { phone: string }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const menuButton = useRef<HTMLButtonElement>(null);

  useEffect(() => { setOpen(false); }, [path]);

  useEffect(() => {
    if (!open) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      menuButton.current?.focus();
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  return <><a className="skip-link" href="#main-content">Aller au contenu</a><header className="site-header"><div className="container header-inner"><Link href="/" className="brand" onClick={() => setOpen(false)}><Image src="/branding/a2e-logo.jpeg" alt="A2E" width={83} height={47} priority /><span>RÉNOVATION<span>Penser. Transformer. Habiter.</span></span></Link><nav aria-label="Navigation principale" className="desktop-nav">{nav.map(([label, href]) => <Link href={href} key={href} aria-current={path.startsWith(href) ? "page" : undefined}>{label}</Link>)}</nav><div className="header-actions"><Link href="/simulateur" className="header-cta" onClick={() => setOpen(false)} data-track="cta_click" data-track-label="En-tete"><span>Estimer<span className="hidden sm:inline"> mes travaux</span></span> <ArrowUpRight size={16} /></Link><button ref={menuButton} type="button" className="menu-toggle" onClick={() => setOpen((current) => !current)} aria-expanded={open} aria-controls={open ? "mobile-nav" : undefined} aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}>{open ? <X /> : <Menu />}</button></div></div>{open && <nav id="mobile-nav" className="mobile-nav container" aria-label="Navigation mobile">{nav.map(([label, href]) => <Link key={href} href={href} aria-current={path.startsWith(href) ? "page" : undefined} onClick={() => setOpen(false)}>{label}<ArrowUpRight size={18} /></Link>)}<a href={`tel:${phone.replace(/[^+\d]/g, "")}`}><Phone size={17} /> {phone}</a><Link href="/admin" onClick={() => setOpen(false)}>Espace équipe <ArrowUpRight size={18} /></Link></nav>}</header></>;
}
