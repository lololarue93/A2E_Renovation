"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { ArrowUpRight, Calculator, ChartNoAxesCombined, ClipboardList, Images, Settings2, ShieldCheck, Tags } from "lucide-react";

const sections = [
  { id: "overview", label: "Vue d'ensemble", icon: ChartNoAxesCombined },
  { id: "pipeline", label: "Dossiers clients", icon: ClipboardList },
  { id: "pricing", label: "Bibliotheque de prix", icon: Tags },
  { id: "gallery", label: "Realisations & medias", icon: Images },
  { id: "settings", label: "Site & notifications", icon: Settings2 },
  { id: "audit", label: "Journal & exports", icon: ShieldCheck }
] as const;
type SectionId = typeof sections[number]["id"];

export function AdminWorkspace({ overview, pipeline, pricing, gallery, settings, audit }: Record<SectionId, ReactNode>) {
  const [active, setActive] = useState<SectionId>("overview");
  useEffect(() => {
    const sync = () => {
      const hash = window.location.hash.slice(1);
      const legacy = hash === "notifications" ? "settings" : hash;
      if (sections.some((section) => section.id === legacy)) setActive(legacy as SectionId);
      else if (new URLSearchParams(window.location.search).has("lead")) setActive("pipeline");
    };
    sync(); window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  const content = { overview, pipeline, pricing, gallery, settings, audit };
  return <main id="main-content" className="min-h-screen bg-pearl">
    <div className="mx-auto grid max-w-[1600px] lg:grid-cols-[15.5rem_minmax(0,1fr)]">
      <aside className="bg-navy text-white lg:sticky lg:top-0 lg:h-screen">
        <div className="flex items-center justify-between gap-4 border-b border-white/10 p-6 lg:block lg:px-7 lg:py-9">
          <div><Link href="/admin" className="text-2xl font-black tracking-tight">A2E<span className="ml-2 text-sm font-medium text-white/60">Studio</span></Link><p className="mt-2 text-xs font-bold uppercase tracking-[.2em] text-white/50">Espace de gestion</p></div>
          <Link href="/" className="inline-flex min-h-11 items-center gap-2 text-xs font-bold text-white/75 lg:mt-5">Voir le site <ArrowUpRight size={14} /></Link>
        </div>
        <nav aria-label="Gestion A2E" className="grid grid-cols-2 gap-1 p-3 sm:grid-cols-3 lg:grid-cols-1 lg:px-4 lg:py-7">
          {sections.map(({ id, label, icon: Icon }) => <a key={id} href={`#${id}`} onClick={() => setActive(id)} aria-current={active === id ? "page" : undefined} className={`flex min-h-12 items-center gap-3 rounded-xl px-3 py-3 text-xs font-bold transition-colors sm:text-sm ${active === id ? "bg-white text-navy" : "text-white/70 hover:bg-white/10 hover:text-white"}`}><Icon size={18} className="shrink-0" /><span>{label}</span></a>)}
        </nav>
        <div className="hidden border-t border-white/10 px-7 py-6 lg:block"><p className="text-xs leading-6 text-white/50">Une seule source pour vos prix, vos dossiers et vos contenus.</p><Link href="/admin/cotations" className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-white"><Calculator size={17} /> Composer une cotation <ArrowUpRight size={14} /></Link></div>
      </aside>
      <div className="min-w-0 px-4 pb-16 pt-7 sm:px-7 lg:px-10 lg:pt-10">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-navy/10 pb-7"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-champagne">A2E / Pilotage</p><h1 className="mt-2 text-3xl font-black tracking-tight text-navy sm:text-4xl">{sections.find((section) => section.id === active)?.label}</h1></div><Link href="/admin/cotations" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-navy px-5 text-sm font-bold text-white"><Calculator size={17} /> Nouvelle cotation <ArrowUpRight size={16} /></Link></header>
        <div id={active} className="pt-7">{content[active]}</div>
      </div>
    </div>
  </main>;
}
