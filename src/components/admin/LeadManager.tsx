"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ArrowRight, CheckCircle2, ChevronLeft, ChevronRight, Mail, Phone, RefreshCw, Search, X } from "lucide-react";
import { leadStatuses, leadStatusLabels, type LeadStatusValue } from "@/lib/admin/lead-status";

type Estimate = { number: string; low: number; mid: number; high: number; lines: { id: string; label: string; quantity: number; unit: string; mid: number }[] };
type Lead = { id: string; name: string; phone: string; email: string; city: string | null; typeProjet: string; budget: number | null; status: LeadStatusValue; consent: boolean; sourceLead: string; createdAt: string; project: { type: string; city: string | null; postalCode: string | null; surface: number | null; details?: { message?: string } } | null; estimates: Estimate[]; notes: { id: string; text: string; createdAt: string }[] };
type LeadPage = { leads: Lead[]; total: number; page: number; pageSize: number; error?: string };
const money = (value: number) => `${value.toLocaleString("fr-FR")} EUR`;
const date = (value: string) => new Date(value).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "short", year: "numeric" });

export function LeadManager() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("");
  const [consent, setConsent] = useState("yes");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Lead | null>(null);
  const [status, setStatus] = useState<LeadStatusValue>("nouveau");
  const [note, setNote] = useState("");
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams({ search: query, status: filter, consent, page: String(page) });
      const response = await fetch(`/api/admin/leads?${params}`, { cache: "no-store", signal });
      const data = await response.json() as LeadPage;
      if (!response.ok) throw new Error(data.error ?? "Les dossiers sont indisponibles.");
      setLeads(data.leads); setTotal(data.total);
    } catch (cause) {
      if (!(cause instanceof Error && cause.name === "AbortError")) setError(cause instanceof Error ? cause.message : "Connexion impossible.");
    } finally { if (!signal?.aborted) setLoading(false); }
  }, [query, filter, consent, page]);
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load]);
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("lead");
    if (!id) return;
    fetch(`/api/admin/leads?id=${encodeURIComponent(id)}&consent=all`, { cache: "no-store" }).then(async (response) => {
      if (!response.ok) return;
      const data = await response.json() as LeadPage;
      if (data.leads[0]) { setSelected(data.leads[0]); setStatus(data.leads[0].status); }
    }).catch(() => undefined);
  }, []);

  function open(lead: Lead) { setSelected(lead); setStatus(lead.status); setNote(""); setFeedback(""); }
  async function save(event: FormEvent) {
    event.preventDefault(); if (!selected) return;
    setSaving(true); setFeedback("");
    try {
      const response = await fetch("/api/admin/leads", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: selected.id, status, previousStatus: selected.status, note }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Enregistrement impossible.");
      const verification = await fetch(`/api/admin/leads?id=${encodeURIComponent(selected.id)}&consent=all`, { cache: "no-store" });
      const fresh = await verification.json() as LeadPage;
      if (!verification.ok || !fresh.leads[0] || fresh.leads[0].status !== status) throw new Error("Sauvegarde envoyee, mais sa relecture n'a pas pu etre confirmee. Rechargez le dossier.");
      setSelected(fresh.leads[0]); setNote(""); setFeedback("Dossier enregistre et relu en base."); await load();
    } catch (cause) { setFeedback(cause instanceof Error ? cause.message : "Connexion impossible."); }
    finally { setSaving(false); }
  }

  return <section>
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-2xl font-black text-navy">Du premier contact au chantier.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-ink/60">Retrouvez un client, consultez son estimation et suivez l'avancement. Les notes restent dans le journal interne.</p></div><button type="button" onClick={() => void load()} disabled={loading} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-navy/15 bg-white px-4 text-sm font-bold text-navy disabled:opacity-50"><RefreshCw size={16} /> Actualiser</button></div>
    <form onSubmit={(event) => { event.preventDefault(); setQuery(search); setPage(1); }} className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
      <label className="relative"><span className="sr-only">Rechercher un dossier</span><Search size={17} className="pointer-events-none absolute left-4 top-4 text-ink/40" /><input className="input min-h-12 pl-11" placeholder="Client, ville, email, travaux..." maxLength={100} value={search} onChange={(event) => setSearch(event.target.value)} /></label>
      <label><span className="sr-only">Filtrer par statut</span><select className="input min-h-12" value={filter} onChange={(event) => { setFilter(event.target.value); setPage(1); }}><option value="">Tous les statuts</option>{leadStatuses.map((value) => <option key={value} value={value}>{leadStatusLabels[value]}</option>)}</select></label>
      <label><span className="sr-only">Filtrer par consentement</span><select className="input min-h-12" value={consent} onChange={(event) => { setConsent(event.target.value); setPage(1); }}><option value="yes">Contact accepte</option><option value="no">Sans consentement</option><option value="all">Tous les dossiers</option></select></label>
      <button className="min-h-12 rounded-xl bg-navy px-5 text-sm font-bold text-white">Rechercher</button>
    </form>
    <p className="mt-4 text-sm text-ink/55" aria-live="polite">{loading ? "Chargement des dossiers..." : `${total} dossier(s) correspondant(s)`}</p>
    {error ? <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">{error}</div> : !loading && leads.length === 0 ? <div className="mt-4 border-y border-navy/10 py-12"><h3 className="text-xl font-bold text-navy">Aucun dossier dans cette selection.</h3><p className="mt-2 text-sm text-ink/60">Les demandes du formulaire et du simulateur apparaitront ici. Elargissez les filtres pour retrouver un dossier existant.</p><Link href="/simulateur" className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-navy">Ouvrir le simulateur <ArrowRight size={16} /></Link></div> : <div className="mt-4 divide-y divide-navy/10 overflow-hidden rounded-xl border border-navy/10 bg-white">
      <div className="hidden grid-cols-[1.2fr_1fr_.7fr_auto] gap-5 bg-navy/5 px-5 py-3 text-xs font-bold uppercase tracking-wide text-ink/50 lg:grid"><span>Client / projet</span><span>Avancement</span><span>Estimation centrale</span><span>Dossier</span></div>
      {leads.map((lead) => <article key={lead.id} className="grid items-center gap-4 p-5 sm:grid-cols-[1fr_auto] lg:grid-cols-[1.2fr_1fr_.7fr_auto]"><div className="min-w-0"><p className="truncate font-bold text-navy">{lead.name}</p><p className="mt-1 text-sm text-ink/60">{lead.city ?? "Ville non renseignee"} / {lead.typeProjet}</p><p className="mt-2 text-xs text-ink/45">{date(lead.createdAt)}</p></div><div><span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${lead.status === "gagne" || lead.status === "signe" ? "bg-[#51796c]/10 text-[#385f51]" : lead.status === "perdu" ? "bg-ink/5 text-ink/50" : "bg-pearl text-navy"}`}>{leadStatusLabels[lead.status]}</span>{!lead.consent && <p className="mt-2 text-xs text-amber-800">Sans consentement au contact</p>}</div><div><p className="font-bold tabular-nums text-navy">{lead.estimates[0] ? money(lead.estimates[0].mid) : lead.budget !== null ? money(lead.budget) : "Non renseignee"}</p><p className="mt-1 text-xs text-ink/45">{lead.estimates[0]?.number ?? "Budget declare"}</p></div><button type="button" onClick={() => open(lead)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-navy/15 px-4 text-sm font-bold text-navy">Ouvrir <ArrowRight size={15} /></button></article>)}
    </div>}
    {total > 20 && <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-ink/60">Page {page} / {Math.ceil(total / 20)}</p><div className="flex gap-2"><button type="button" disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)} className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-navy/15 px-3 text-sm font-bold disabled:opacity-40"><ChevronLeft size={16} /> Precedent</button><button type="button" disabled={page >= Math.ceil(total / 20) || loading} onClick={() => setPage((current) => current + 1)} className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-navy/15 px-3 text-sm font-bold disabled:opacity-40">Suivant <ChevronRight size={16} /></button></div></div>}
    {selected && <div className="mt-8 rounded-2xl border border-navy/15 bg-white p-5 sm:p-7">
      <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.15em] text-champagne">Dossier client</p><h3 className="mt-2 text-2xl font-black text-navy">{selected.name}</h3><p className="mt-2 text-sm text-ink/60">{selected.city ?? "Ville non renseignee"} / {selected.typeProjet} / {date(selected.createdAt)}</p></div><button type="button" onClick={() => setSelected(null)} aria-label="Fermer le dossier" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-navy/10"><X size={19} /></button></div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2"><div>
        {selected.consent ? <div className="flex flex-wrap gap-3"><a href={`tel:${selected.phone.replace(/\s/g, "")}`} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-navy/15 px-4 text-sm font-bold text-navy"><Phone size={16} /> {selected.phone}</a><a href={`mailto:${selected.email}`} className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-lg border border-navy/15 px-4 text-sm font-bold text-navy"><Mail size={16} className="shrink-0" /><span className="truncate">{selected.email}</span></a></div> : <p className="rounded-lg bg-amber-50 p-4 text-sm leading-6 text-amber-900">Ce client n'a pas accepte le contact commercial. Telephone : {selected.phone}. Email : {selected.email}.</p>}
        <dl className="mt-5 grid grid-cols-2 gap-4 text-sm"><div><dt className="text-ink/50">Origine</dt><dd className="mt-1 font-bold text-navy">{selected.sourceLead}</dd></div><div><dt className="text-ink/50">Surface declaree</dt><dd className="mt-1 font-bold text-navy">{selected.project?.surface ? `${selected.project.surface} m2` : "Non renseignee"}</dd></div></dl>
        {typeof selected.project?.details?.message === "string" && <div className="mt-6 border-t border-navy/10 pt-5"><h4 className="font-bold text-navy">Message du client</h4><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-ink/70">{selected.project.details.message}</p></div>}
        {selected.estimates[0] && <div className="mt-6 border-t border-navy/10 pt-5"><p className="font-bold text-navy">{selected.estimates[0].number}</p><p className="mt-2 text-sm text-ink/65">{money(selected.estimates[0].low)} a {money(selected.estimates[0].high)} / centrale {money(selected.estimates[0].mid)}</p><div className="mt-4 divide-y divide-navy/10">{selected.estimates[0].lines.map((line) => <div key={line.id} className="flex justify-between gap-4 py-3 text-sm"><span className="text-ink/70">{line.label}<small className="mt-1 block text-ink/45">{line.quantity} {line.unit}</small></span><strong className="shrink-0 text-navy">{money(line.mid)}</strong></div>)}</div><p className="mt-3 text-xs leading-5 text-ink/50">Fourchette indicative. Le metrage et la visite technique restent necessaires avant un devis ferme.</p></div>}
        <Link href={`/admin/cotations?lead=${encodeURIComponent(selected.id)}`} className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-navy">Composer une cotation pour ce client <ArrowRight size={16} /></Link>
      </div><div><form onSubmit={save} className="rounded-xl bg-pearl p-5"><label className="grid gap-2 text-sm font-bold text-navy">Avancement<select className="input min-h-12" value={status} onChange={(event) => setStatus(event.target.value as LeadStatusValue)}>{leadStatuses.map((value) => <option key={value} value={value}>{leadStatusLabels[value]}</option>)}</select></label><label className="mt-4 grid gap-2 text-sm font-bold text-navy">Nouvelle note interne<textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={2000} className="input min-h-28 font-normal" placeholder="Retour client, prochaine action, points a confirmer..." /></label><button disabled={saving} className="mt-4 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-navy px-5 text-sm font-bold text-white disabled:opacity-50"><CheckCircle2 size={17} /> {saving ? "Enregistrement..." : "Enregistrer le suivi"}</button><p className="mt-3 text-sm leading-6 text-ink/70" role="status">{feedback}</p></form><h4 className="mt-6 font-bold text-navy">Historique des notes</h4>{selected.notes.length ? <ol className="mt-3 space-y-3">{selected.notes.map((item) => <li key={item.id} className="border-l-2 border-champagne/40 pl-4"><time className="text-xs text-ink/50">{date(item.createdAt)}</time><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-ink/75">{item.text}</p></li>)}</ol> : <p className="mt-2 text-sm text-ink/50">Aucune note pour ce dossier.</p>}</div></div>
    </div>}
  </section>;
}
