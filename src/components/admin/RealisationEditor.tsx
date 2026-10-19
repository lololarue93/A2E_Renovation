"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { ArrowDown, CheckCircle2, Eye, ImagePlus, Plus, RefreshCw } from "lucide-react";
import { ProjectGallery } from "@/components/marketing/ProjectGallery";
import { toGalleryProject } from "@/lib/realisations/gallery";
import { demoProjectNotice, isGeneratedDemoProject } from "@/lib/realisations/demo-projects";

type Item = Parameters<typeof toGalleryProject>[0] & { active: boolean; isDemo?: boolean };
const emptyItem: Item = { id: "", title: "", city: "", type: "", description: "", duration: "", budget: "", tags: [], active: false, media: [], photos: [] };

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
  const [preview, setPreview] = useState(false);
  const saved = items.find(item => item.id === draft.id);
  const gallery = saved ? toGalleryProject(saved) : null;
  const canPublish = !!gallery?.assets.some(asset => asset.kind === "image");

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/realisations", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Fiches indisponibles.");
      const reloaded: Item[] = (data.realisations ?? []).map((item: Item) => ({ ...item, media: item.media ?? [], photos: item.photos ?? [] }));
      setItems(reloaded); return reloaded;
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Connexion impossible."); return null; }
    finally { setLoading(false); }
  }
  useEffect(() => {
    void load();
    const updated = () => { void load(); };
    window.addEventListener("a2e:media-updated", updated);
    return () => window.removeEventListener("a2e:media-updated", updated);
  }, []);
  function update(patch: Partial<Item>) { setDraft(current => ({ ...current, ...patch })); }
  function select(item: Item) { setDraft(item); setTagsText(item.tags.join(", ")); setCreating(false); setStatus(""); setError(""); setPreview(false); window.dispatchEvent(new CustomEvent("a2e:realisation-selected", { detail: item.id })); }
  function create() { setDraft({ ...emptyItem, tags: [] }); setTagsText(""); setCreating(true); setStatus(""); setError(""); setPreview(false); }
  async function persist(active = draft.active) {
    setSaving(true); setStatus(""); setError("");
    const { title, city, type, description, duration, budget } = draft;
    const fields = { title, city, type, description, duration, budget, tags: tagsText.split(",").map(tag => tag.trim()).filter(Boolean), active: creating ? false : active };
    try {
      const response = await fetch("/api/admin/realisations", { method: creating ? "POST" : "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(creating ? fields : { id: draft.id, ...fields }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Enregistrement impossible.");
      const reloaded = await load();
      const stored = reloaded?.find(item => item.id === data.realisation.id);
      if (!stored || ["title", "city", "type", "description", "duration", "budget", "active"].some(key => stored[key as keyof Item] !== data.realisation[key]) || JSON.stringify(stored.tags) !== JSON.stringify(data.realisation.tags)) throw new Error("L’envoi a réussi mais la relecture n’a pas pu être confirmée. Rechargez avant de continuer.");
      setDraft(stored); setTagsText(stored.tags.join(", ")); setCreating(false);
      setStatus(stored.active ? `${stored.isDemo ? "Inspiration" : "Réalisation"} publiée : statut et fiche confirmés après rechargement.` : "Brouillon enregistré et relu. Ajoutez vos médias, vérifiez l’aperçu, puis publiez.");
      window.dispatchEvent(new Event("a2e:realisations-updated"));
      window.dispatchEvent(new CustomEvent("a2e:realisation-selected", { detail: stored.id }));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Connexion impossible."); }
    finally { setSaving(false); }
  }
  function submit(event: FormEvent) { event.preventDefault(); void persist(); }
  function goToPhotos() { window.dispatchEvent(new CustomEvent("a2e:realisation-selected", { detail: draft.id })); document.getElementById("realisation-media")?.scrollIntoView({ behavior: "auto", block: "start" }); }
  const filtered = items.filter(item => `${item.title} ${item.city} ${item.type}`.toLocaleLowerCase("fr").includes(search.toLocaleLowerCase("fr")));
  return <section>
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="eyebrow">Votre galerie</p><h2 className="text-2xl font-semibold text-navy">Du chantier à la vitrine.</h2><p className="mt-2 max-w-2xl text-sm leading-7 text-ink/60">Une fiche, les bonnes photos, un aperçu : publiez quand tout est prêt.</p></div><div className="flex gap-2"><button type="button" onClick={() => { setError(""); void load(); }} disabled={loading} aria-label="Recharger les réalisations" className="inline-flex h-12 w-12 items-center justify-center border border-navy/15 bg-white disabled:opacity-50"><RefreshCw size={18} /></button><button type="button" onClick={create} className="inline-flex min-h-12 items-center gap-2 bg-navy px-5 text-sm font-semibold text-white"><Plus size={17} /> Nouvelle réalisation</button></div></div>
    <ol className="mt-6 grid gap-2 border-y border-navy/15 py-4 text-sm text-ink/60 sm:grid-cols-4"><li><strong className="text-navy">01</strong> Créer la fiche</li><li><strong className="text-navy">02</strong> Ajouter les photos</li><li><strong className="text-navy">03</strong> Vérifier l’aperçu</li><li><strong className="text-navy">04</strong> Publier</li></ol>
    {loading && <p className="mt-5 text-sm text-ink/60" role="status">Chargement des fiches…</p>}
    {error && <p className="mt-5 border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">{error}</p>}
    {status && <p className="mt-5 bg-[#51796c]/10 p-4 text-sm text-[#385f51]" role="status">{status}</p>}
    {isGeneratedDemoProject(draft.id) && <aside className="mt-5 border-l-2 border-champagne bg-pearl p-4 text-sm leading-7 text-navy"><p className="font-semibold">Provenance interne de cette inspiration</p><p>{demoProjectNotice}</p><p className="mt-2">La galerie publique présente ces visuels comme une inspiration, avec les vues « Avant envisagé » et « Après projeté ». Vos textes et médias restent modifiables ; les anciennes mentions de démonstration sont retirées à l’affichage public. Pour un chantier réellement exécuté, créez une nouvelle réalisation avec ses propres photos.</p></aside>}
    <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,.7fr)_minmax(0,1.3fr)]">
      <div><label className="block"><span className="sr-only">Rechercher une réalisation</span><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Rechercher une fiche…" className="input min-h-12" /></label><div className="mt-3 max-h-[38rem] space-y-2 overflow-y-auto">{filtered.map(item => <button key={item.id} type="button" onClick={() => select(item)} aria-pressed={draft.id === item.id} className={`w-full border p-4 text-left ${draft.id === item.id ? "border-navy bg-white" : "border-navy/10 bg-white/60 hover:border-navy/30"}`}><span className="block font-semibold text-navy">{item.title}</span><span className="mt-1 block text-sm text-ink/60">{item.city} / {item.type}</span><span className="mt-3 inline-flex bg-pearl px-2.5 py-1 text-xs font-semibold text-ink/60">{item.isDemo ? "Inspiration" : item.active ? "Publiée" : "Brouillon"}</span><span className="ml-3 text-xs text-ink/50">{(item.media ?? []).length} média(s)</span></button>)}{!loading && !filtered.length && <p className="py-7 text-sm text-ink/60">Aucune fiche pour le moment. Créez une réalisation ou changez la recherche.</p>}</div></div>
      {creating || draft.id ? <form onSubmit={submit} className="border border-navy/10 bg-white p-5 sm:p-6"><div className="mb-5 flex flex-wrap justify-between gap-3"><p className="text-sm font-semibold text-champagne">{creating ? "Nouvelle fiche / Brouillon" : "01 / Présenter le chantier"}</p><span className="text-xs font-semibold text-navy">{saved?.active ? "Publiée sur le site" : "Non publiée"}</span></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Titre *"><input className="input" required minLength={3} maxLength={160} value={draft.title} onChange={event => update({ title: event.target.value })} /></Field><Field label="Ville / zone *"><input className="input" required minLength={2} maxLength={120} value={draft.city} onChange={event => update({ city: event.target.value })} /></Field><Field label="Type de travaux *"><input className="input" required minLength={2} maxLength={120} value={draft.type} onChange={event => update({ type: event.target.value })} /></Field><Field label="Durée (facultatif)"><input className="input" maxLength={80} placeholder="Ex. 6 semaines" value={draft.duration} onChange={event => update({ duration: event.target.value })} /></Field><Field label="Budget affiché (facultatif)"><input className="input" maxLength={120} placeholder="Ex. Sur étude" value={draft.budget} onChange={event => update({ budget: event.target.value })} /></Field><Field label="Mots-clés (8 maximum)"><input className="input" placeholder="Cuisine, agencement, finitions" value={tagsText} onChange={event => setTagsText(event.target.value)} /></Field><div className="sm:col-span-2"><Field label="Description *"><textarea className="input min-h-32" required minLength={10} maxLength={2000} value={draft.description} onChange={event => update({ description: event.target.value })} /></Field></div></div><button disabled={saving} className="mt-5 inline-flex min-h-12 items-center gap-2 bg-navy px-5 text-sm font-semibold text-white disabled:opacity-50"><CheckCircle2 size={17} /> {saving ? "Enregistrement…" : creating ? "Créer le brouillon" : "Enregistrer la fiche"}</button>
      {!creating && <div className="mt-6 border-t border-navy/15 pt-5"><p className="text-sm leading-7 text-ink/60">{canPublish ? "Vos photos sont prêtes pour l’aperçu. La publication rend la fiche et ses médias visibles sur le site." : "Ajoutez au moins une photo pour préparer l’aperçu et la publication."}</p><div className="mt-4 flex flex-wrap gap-3"><button type="button" onClick={goToPhotos} className="inline-flex min-h-12 items-center gap-2 border border-navy/15 px-4 text-sm font-semibold text-navy"><ImagePlus size={17} /> Photos & vidéos <ArrowDown size={15} /></button><button type="button" disabled={!gallery?.assets.length} onClick={() => setPreview(value => !value)} className="inline-flex min-h-12 items-center gap-2 border border-navy/15 px-4 text-sm font-semibold text-navy disabled:opacity-40"><Eye size={17} /> {preview ? "Masquer l’aperçu" : "Aperçu enregistré"}</button><button type="button" disabled={saving || (!saved?.active && !canPublish)} onClick={() => void persist(!saved?.active)} className="inline-flex min-h-12 items-center gap-2 bg-[#51796c] px-4 text-sm font-semibold text-white disabled:opacity-40">{saved?.active ? "Passer en brouillon" : "Publier sur le site"}</button></div><p className="mt-4 text-xs leading-6 text-ink/50">Utilisez des photos de chantiers autorisées et des informations factuelles. Un brouillon reste invisible aux visiteurs.</p></div>}</form> : <div className="flex min-h-64 items-center border border-dashed border-navy/20 p-7"><div><h3 className="text-xl font-semibold text-navy">Votre premier chantier à partager.</h3><p className="mt-3 text-sm leading-7 text-ink/60">Créez un brouillon, ajoutez vos photos puis découvrez le rendu avant de publier.</p><button onClick={create} type="button" className="mt-5 min-h-11 text-sm font-semibold text-navy">+ Créer une fiche</button></div></div>}
    </div>
    {preview && gallery && <div className="mt-8 border-t border-navy/15 pt-6"><p className="eyebrow">03 / Aperçu des données enregistrées</p><ProjectGallery projects={[gallery]} preview /></div>}
  </section>;
}

function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="grid gap-2 text-sm font-semibold text-ink/80">{label}{children}</label>; }
