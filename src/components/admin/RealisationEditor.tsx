"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { CheckCircle2, Plus, RefreshCw } from "lucide-react";

type Item = { id: string; title: string; city: string; type: string; description: string; duration: string; budget: string; tags: string[]; active: boolean; isDemo?: boolean };
const emptyItem: Item = { id: "", title: "", city: "", type: "", description: "", duration: "", budget: "", tags: [], active: false };

export function RealisationEditor() {
  const [items, setItems] = useState<Item[]>([]);
  const [draft, setDraft] = useState<Item>(emptyItem);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [tagsText, setTagsText] = useState("");

  async function load() {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/admin/realisations", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Fiches indisponibles.");
      setItems(data.realisations ?? []);
      return data.realisations as Item[];
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Connexion impossible."); return null; }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  function update(patch: Partial<Item>) { setDraft((current) => ({ ...current, ...patch })); }
  function select(item: Item) { setDraft(item); setTagsText(item.tags.join(", ")); setCreating(false); setStatus(""); setError(""); }
  function create() { setDraft({ ...emptyItem, tags: [] }); setTagsText(""); setCreating(true); setStatus(""); setError(""); }
  async function save(event: FormEvent) {
    event.preventDefault(); setSaving(true); setStatus(""); setError("");
    const { title, city, type, description, duration, budget, active } = draft;
    const fields = { title, city, type, description, duration, budget, tags: tagsText.split(",").map((tag) => tag.trim()).filter(Boolean), active };
    try {
      const response = await fetch("/api/admin/realisations", { method: creating ? "POST" : "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(creating ? fields : { id: draft.id, ...fields }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Enregistrement impossible.");
      const reloaded = await load();
      const saved = reloaded?.find((item) => item.id === data.realisation.id);
      if (!saved || saved.title !== data.realisation.title || saved.active !== data.realisation.active || saved.description !== data.realisation.description) throw new Error("Sauvegarde envoyee, mais sa relecture n'a pas pu etre confirmee. Rechargez les fiches.");
      setDraft(saved); setTagsText(saved.tags.join(", ")); setCreating(false); setStatus("Fiche enregistree et relue en base. Vous pouvez maintenant associer des photos et videos ci-dessous.");
      window.dispatchEvent(new Event("a2e:realisations-updated"));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Connexion impossible."); }
    finally { setSaving(false); }
  }
  const filtered = items.filter((item) => `${item.title} ${item.city} ${item.type}`.toLowerCase().includes(search.toLowerCase()));
  return <section>
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-2xl font-black text-navy">Vos chantiers, votre signature.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-ink/60">Creez une fiche, ajoutez des medias puis publiez la realisation. Les nouveaux projets commencent en brouillon.</p></div><div className="flex gap-2"><button type="button" onClick={() => void load()} disabled={loading} aria-label="Recharger les realisations" className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-navy/15 bg-white disabled:opacity-50"><RefreshCw size={18} /></button><button type="button" onClick={create} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-navy px-5 text-sm font-bold text-white"><Plus size={17} /> Nouvelle realisation</button></div></div>
    {loading && <p className="mt-5 text-sm text-ink/60" role="status">Chargement des fiches...</p>}
    {error && <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">{error}</p>}
    {status && <p className="mt-5 rounded-xl bg-[#51796c]/10 p-4 text-sm text-[#385f51]" role="status">{status}</p>}
    <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,.75fr)_minmax(0,1.25fr)]">
      <div><label className="block"><span className="sr-only">Rechercher une realisation</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher une fiche..." className="input min-h-12" /></label><div className="mt-3 max-h-[38rem] space-y-2 overflow-y-auto">{filtered.map((item) => <button key={item.id} type="button" onClick={() => select(item)} className={`w-full rounded-xl border p-4 text-left ${draft.id === item.id ? "border-navy bg-white" : "border-navy/10 bg-white/60 hover:border-navy/30"}`}><span className="block font-bold text-navy">{item.title}</span><span className="mt-1 block text-sm text-ink/60">{item.city} / {item.type}</span><span className="mt-3 inline-flex rounded-full bg-pearl px-2.5 py-1 text-xs font-bold text-ink/60">{item.isDemo ? "Exemple a personnaliser" : item.active ? "Publiee" : "Brouillon"}</span></button>)}{!loading && !filtered.length && <p className="py-7 text-sm text-ink/60">Aucune fiche. Creez votre premiere realisation ou changez votre recherche.</p>}</div></div>
      {creating || draft.id ? <form onSubmit={save} className="rounded-2xl border border-navy/10 bg-white p-5 sm:p-6"><p className="mb-5 text-sm font-bold text-champagne">{creating ? "Nouvelle fiche / Brouillon" : "Modifier la fiche"}</p><div className="grid gap-4 sm:grid-cols-2"><Field label="Titre *"><input className="input" required minLength={3} maxLength={160} value={draft.title} onChange={(event) => update({ title: event.target.value })} /></Field><Field label="Ville / zone *"><input className="input" required minLength={2} maxLength={120} value={draft.city} onChange={(event) => update({ city: event.target.value })} /></Field><Field label="Type de travaux *"><input className="input" required minLength={2} maxLength={120} value={draft.type} onChange={(event) => update({ type: event.target.value })} /></Field><Field label="Duree"><input className="input" maxLength={80} placeholder="Ex. 6 semaines" value={draft.duration} onChange={(event) => update({ duration: event.target.value })} /></Field><Field label="Budget affiche"><input className="input" maxLength={120} placeholder="Ex. Sur etude" value={draft.budget} onChange={(event) => update({ budget: event.target.value })} /></Field><Field label="Tags (8 maximum)"><input className="input" placeholder="Cuisine, agencement, finitions" value={tagsText} onChange={(event) => setTagsText(event.target.value)} /></Field><div className="sm:col-span-2"><Field label="Description *"><textarea className="input min-h-32" required minLength={10} maxLength={2000} value={draft.description} onChange={(event) => update({ description: event.target.value })} /></Field></div></div><label className="mt-5 flex min-h-12 items-center gap-3 text-sm font-bold text-navy"><input type="checkbox" checked={draft.active} onChange={(event) => update({ active: event.target.checked })} /> Publier sur le site</label><p className="mt-1 text-xs leading-5 text-ink/50">Utilisez uniquement des photos de chantiers autorisees. Les exemples doivent etre personnalises avant publication.</p><button disabled={saving} className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-xl bg-navy px-5 text-sm font-bold text-white disabled:opacity-50"><CheckCircle2 size={17} /> {saving ? "Enregistrement..." : creating ? "Creer la fiche" : "Enregistrer les modifications"}</button></form> : <div className="flex min-h-64 items-center rounded-2xl border border-dashed border-navy/20 p-7"><div><h3 className="text-xl font-bold text-navy">Une galerie qui se construit au fil des projets.</h3><p className="mt-3 text-sm leading-6 text-ink/60">Selectionnez une fiche pour la modifier, ou creez une realisation pour documenter un nouveau chantier.</p><button onClick={create} type="button" className="mt-5 min-h-11 text-sm font-bold text-navy">+ Creer ma premiere fiche</button></div></div>}
    </div>
  </section>;
}

function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="grid gap-2 text-sm font-bold text-ink/80">{label}{children}</label>; }
