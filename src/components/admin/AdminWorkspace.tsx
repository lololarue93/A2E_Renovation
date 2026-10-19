"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { ArrowUpRight, Calculator, ChartNoAxesCombined, ClipboardList, Images, Mail, Settings2, ShieldCheck, Tags, UsersRound } from "lucide-react";
import { AdminLogout } from "./AdminLogout";
import { roleLabels } from "@/lib/auth/permissions";
import { allows, type AdminUiIdentity } from "./admin-ui-types";

const sections = [
  { id: "overview", label: "Activité & conversions", description: "Repérez les étapes à améliorer et les dossiers qui demandent une action.", icon: ChartNoAxesCombined, permission: "dashboard:read" },
  { id: "pipeline", label: "Dossiers clients", description: "Retrouvez les demandes, préparez la prochaine action et suivez les échanges.", icon: ClipboardList, permission: "crm:read" },
  { id: "mail", label: "Messagerie", description: "Préparez vos emails, organisez les destinataires et vérifiez les tentatives d’envoi.", icon: Mail, permission: "mail:read" },
  { id: "pricing", label: "Catalogue de prix", description: "Les mêmes références alimentent le simulateur public et vos cotations.", icon: Tags, permission: "pricing:read" },
  { id: "gallery", label: "Réalisations & avis", description: "Préparez vos projets et publiez les avis réels avec l'accord de vos clients.", icon: Images, permission: "gallery:read" },
  { id: "team", label: "Équipe & accès", description: "Un compte individuel pour chaque personne, avec les droits utiles à son travail.", icon: UsersRound, permission: "users:manage" },
  { id: "settings", label: "Site & notifications", description: "Mettez à jour vos coordonnées et les préférences de suivi du site.", icon: Settings2, permission: "settings:read" },
  { id: "audit", label: "Journal & exports", description: "Vérifiez les envois et retrouvez les modifications enregistrées.", icon: ShieldCheck, permission: "audit:read" }
] as const;
type SectionId = typeof sections[number]["id"];
type BaseSectionId = Exclude<SectionId, "mail" | "team">;
export type AdminWorkspaceProps = Record<BaseSectionId, ReactNode> & Partial<Record<"mail" | "team", ReactNode>> & { identity?: AdminUiIdentity };

export function AdminWorkspace({ overview, pipeline, pricing, gallery, settings, audit, mail, team, identity }: AdminWorkspaceProps) {
  const [active, setActive] = useState<SectionId>("overview");
  const [visited, setVisited] = useState<SectionId[]>(["overview"]);
  const content = { overview, pipeline, pricing, gallery, settings, audit, mail, team };
  const available = sections.filter(item => content[item.id] !== undefined && (!identity || allows(identity, item.permission)));
  const allowedIds = available.map(item => item.id).join(",");
  useEffect(() => {
    const sync = () => {
      const hash = window.location.hash.slice(1);
      const legacy = hash === "notifications" ? "settings" : hash;
      if (allowedIds.split(",").includes(legacy)) { setActive(legacy as SectionId); setVisited(old => old.includes(legacy as SectionId) ? old : [...old, legacy as SectionId]); }
      else if (new URLSearchParams(window.location.search).has("lead") && allowedIds.split(",").includes("pipeline")) { setActive("pipeline"); setVisited(old => old.includes("pipeline") ? old : [...old, "pipeline"]); }
    };
    sync(); window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [allowedIds]);
  const section = available.find((item) => item.id === active) ?? available[0];
  const canQuote = !identity || allows(identity, "quotes:read");
  if (!section) return <main id="main-content" className="container py-12"><h1 className="text-2xl font-semibold text-navy">Aucune rubrique disponible.</h1><p className="mt-4 text-ink/70">Contactez l’administrateur pour vérifier vos droits.</p><div className="mt-6"><AdminLogout /></div></main>;
  const current = section.id;
  return <main id="main-content" className="min-h-screen bg-pearl">
    <div className="mx-auto grid max-w-[1600px] lg:grid-cols-[15.5rem_minmax(0,1fr)]">
      <aside className="bg-navy text-white lg:sticky lg:top-0 lg:h-screen">
        <div className="flex items-center justify-between gap-4 border-b border-white/10 p-6 lg:block lg:px-7 lg:py-9">
          <div><Link href="/admin" className="text-2xl font-black tracking-tight">A2E<span className="ml-2 text-sm font-medium text-white/60">Studio</span></Link><p className="mt-2 text-xs font-bold uppercase tracking-[.2em] text-white/50">Espace de gestion</p></div>
          <Link href="/" className="inline-flex min-h-11 items-center gap-2 text-xs font-bold text-white/75 lg:mt-5">Voir le site <ArrowUpRight size={14} /></Link>
        </div>
        <label className="mx-4 mb-4 block lg:hidden"><span className="mb-2 block text-sm text-white/75">Que souhaitez-vous gérer ?</span><select aria-label="Rubrique de gestion" value={current} onChange={event => { const id = event.target.value as SectionId; setActive(id); setVisited(old => old.includes(id) ? old : [...old, id]); window.location.hash = id; }} className="min-h-12 w-full rounded-sm border border-white/25 bg-navy px-3 text-sm font-semibold text-white">{available.map(({ id, label }) => <option key={id} value={id}>{label}</option>)}</select></label>
        <nav aria-label="Gestion A2E" className="hidden grid-cols-1 gap-1 px-4 py-7 lg:grid">
          {available.map(({ id, label, icon: Icon }) => <a key={id} href={`#${id}`} onClick={() => { setActive(id); setVisited(old => old.includes(id) ? old : [...old, id]); }} aria-current={current === id ? "page" : undefined} className={`flex min-h-12 items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold transition-colors ${current === id ? "bg-white text-navy" : "text-white/75 hover:bg-white/10 hover:text-white"}`}><Icon size={18} className="shrink-0" /><span>{label}</span></a>)}
        </nav>
        <div className="hidden border-t border-white/10 px-7 py-6 lg:block"><p className="text-sm leading-6 text-white/65">Vos dossiers, vos contenus et les prochaines actions de l’équipe.</p>{canQuote && <Link href="/admin/cotations" className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-white"><Calculator size={17} /> {allows(identity, "quotes:write") || !identity ? "Composer une cotation" : "Consulter les cotations"} <ArrowUpRight size={14} /></Link>}</div>
      </aside>
      <div className="min-w-0 px-4 pb-16 pt-7 sm:px-7 lg:px-10 lg:pt-10">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-navy/10 pb-7"><div className="max-w-xl"><p className="text-xs font-bold uppercase tracking-[.18em] text-champagne">A2E / Pilotage</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-navy sm:text-4xl">{section.label}</h1><p className="mt-3 text-sm leading-6 text-ink/65">{section.description}</p></div>{canQuote && <Link href="/admin/cotations" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-sm bg-navy px-5 text-sm font-bold text-white"><Calculator size={17} /> {allows(identity, "quotes:write") || !identity ? "Nouvelle cotation" : "Voir les cotations"} <ArrowUpRight size={16} /></Link>}</header>
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3">{identity ? <p className="break-all text-sm text-ink/65">{identity.name || identity.email} · {roleLabels[identity.role]}</p> : <span />}<AdminLogout /></div>
        {available.filter(item => visited.includes(item.id) || current === item.id).map(item => <div key={item.id} id={item.id} hidden={current !== item.id} className="pt-7">{content[item.id]}</div>)}
      </div>
    </div>
  </main>;
}
