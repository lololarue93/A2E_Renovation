"use client";

import Image from "next/image";
import { type FormEvent, useEffect, useState } from "react";
import { ArrowDown, ArrowUp, CheckCircle2, ImagePlus, Pencil, RefreshCw, Star, Trash2, Upload, Video, X } from "lucide-react";
import type { GalleryRole } from "@/lib/realisations/gallery";

type Asset = { id: string; kind: string; url: string; title?: string | null; alt?: string | null; realisationId?: string | null; role: GalleryRole; sortOrder: number; cover: boolean; comparisonConfirmed: boolean };
type Realisation = { id: string; title: string; active: boolean };
const labels: Record<GalleryRole, string> = { gallery: "Galerie", before: "Avant travaux", after: "Après travaux" };

async function compressImage(file: File) {
  if (!file.type.startsWith("image/") || file.size < 1_500_000) return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 2200 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/webp", 0.82));
  bitmap.close();
  return blob ? new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), { type: "image/webp" }) : file;
}

export function RealisationMediaManager() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [realisations, setRealisations] = useState<Realisation[]>([]);
  const [selected, setSelected] = useState("");
  const [role, setRole] = useState<GalleryRole>("gallery");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);
  const project = realisations.find(item => item.id === selected);
  const shown = assets.filter(asset => asset.realisationId === selected).sort((first, second) => first.sortOrder - second.sortOrder);
  const before = shown.find(asset => asset.role === "before"), after = shown.find(asset => asset.role === "after");
  const comparisonConfirmed = !!before && !!after && before.comparisonConfirmed;
  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/media", { cache: "no-store" }); const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Bibliothèque indisponible.");
      const stored: Asset[] = data.assets ?? []; const projects: Realisation[] = data.realisations ?? [];
      setAssets(stored); setRealisations(projects); setSelected(current => projects.some(item => item.id === current) ? current : projects[0]?.id ?? "");
      return stored;
    } finally { setLoading(false); }
  }
  useEffect(() => {
    const refresh = () => { void load().catch(cause => setError(cause instanceof Error ? cause.message : "Impossible de charger la bibliothèque.")); };
    const select = (event: Event) => { setSelected((event as CustomEvent<string>).detail); setEditing(null); setStatus(""); setError(""); };
    refresh(); window.addEventListener("a2e:realisations-updated", refresh); window.addEventListener("a2e:realisation-selected", select);
    return () => { window.removeEventListener("a2e:realisations-updated", refresh); window.removeEventListener("a2e:realisation-selected", select); };
  }, []);
  function notify() { window.dispatchEvent(new CustomEvent("a2e:media-updated", { detail: selected })); }
  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const formElement = event.currentTarget; const form = new FormData(formElement); const original = form.get("file");
    if (!(original instanceof File) || !original.size) { setError("Choisissez un fichier avant l’envoi."); return; }
    setBusy(true); setStatus("Optimisation et envoi du média…"); setError("");
    try {
      form.set("file", await compressImage(original));
      const response = await fetch("/api/admin/media", { method: "POST", body: form }); const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Échec de l’envoi.");
      const stored = await load();
      if (!stored.some(asset => asset.id === data.asset.id && asset.url === data.asset.url && asset.realisationId === selected && asset.role === role)) throw new Error("Le média a été envoyé mais sa relecture n’est pas confirmée. Rechargez avant de renvoyer le fichier.");
      formElement.reset(); setRole("gallery"); setStatus("Média enregistré et vérifié après rechargement. Vous pouvez continuer ou ouvrir l’aperçu de la fiche."); notify();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "L’envoi n’a pas pu être confirmé."); setStatus(""); }
    finally { setBusy(false); }
  }
  async function update(asset: Asset, patch: { title?: string; alt?: string; role?: GalleryRole; cover?: boolean; move?: "up" | "down"; comparisonConfirmed?: boolean }) {
    setBusy(true); setStatus(""); setError("");
    try {
      const response = await fetch("/api/admin/media", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: asset.id, ...patch }) }); const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Modification refusée.");
      const stored = await load(); const reloaded = stored.find(item => item.id === asset.id);
      if (!reloaded || (patch.title !== undefined && reloaded.title !== data.asset.title) || (patch.alt !== undefined && reloaded.alt !== data.asset.alt) || (patch.role !== undefined && reloaded.role !== patch.role) || (patch.cover && !reloaded.cover) || (patch.comparisonConfirmed !== undefined && reloaded.comparisonConfirmed !== patch.comparisonConfirmed) || (patch.move && reloaded.sortOrder !== data.manifest.order.indexOf(asset.id))) throw new Error("Modification envoyée mais relecture non confirmée. Rechargez la bibliothèque.");
      setEditing(null); setStatus("Modification enregistrée et vérifiée après rechargement."); notify();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Modification non confirmée."); }
    finally { setBusy(false); }
  }
  async function remove(asset: Asset) {
    if (!window.confirm(`Supprimer ce média de la fiche « ${project?.title ?? "Réalisation"} » ?`)) return;
    setBusy(true); setStatus(""); setError("");
    try {
      const response = await fetch(`/api/admin/media?id=${encodeURIComponent(asset.id)}`, { method: "DELETE" }); const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Suppression refusée.");
      const stored = await load(); if (stored.some(item => item.id === asset.id)) throw new Error("La suppression n’a pas pu être confirmée après rechargement.");
      setStatus("Média supprimé, bibliothèque rechargée et vérifiée."); notify();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Suppression non confirmée."); }
    finally { setBusy(false); }
  }
  return <section id="realisation-media" className="mt-10 scroll-mt-24 border-t border-navy/15 pt-8">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="eyebrow">02 / Les photos du projet</p><h2 className="text-2xl font-semibold text-navy">Avant, après, et tous les détails.</h2><p className="mt-2 max-w-2xl text-sm leading-7 text-ink/60">Choisissez une fiche. Ajoutez les photos ou vidéos, placez-les dans l’ordre et choisissez la couverture.</p></div><button type="button" disabled={loading || busy} onClick={() => { setError(""); void load().catch(cause => setError(cause instanceof Error ? cause.message : "Rechargement impossible.")); }} className="inline-flex min-h-12 items-center gap-2 border border-navy/15 px-4 text-sm font-semibold text-navy disabled:opacity-40"><RefreshCw size={16} /> Recharger</button></div>
    <label className="mt-5 grid max-w-xl gap-2 text-sm font-semibold text-navy">Fiche à documenter<select value={selected} onChange={event => { setSelected(event.target.value); setEditing(null); setStatus(""); setError(""); }} className="input" disabled={busy}><option value="">Choisir une réalisation</option>{realisations.map(item => <option value={item.id} key={item.id}>{item.title} · {item.active ? "Publiée" : "Brouillon"}</option>)}</select></label>
    {loading && <p className="mt-4 text-sm text-ink/60" role="status">Chargement de la bibliothèque…</p>}
    {error && <p className="mt-4 border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">{error}</p>}
    {status && <p className="mt-4 bg-[#51796c]/10 p-4 text-sm text-[#385f51]" role="status">{status}</p>}
    {!loading && !realisations.length && <p className="mt-6 text-sm text-ink/60">Créez d’abord le brouillon ci-dessus. Vous pourrez ensuite lui associer des médias.</p>}
    {project && <><p className="mt-4 text-sm leading-7 text-ink/60"><strong className="font-semibold text-navy">{project.active ? "Fiche publiée." : "Fiche en brouillon."}</strong> {project.active ? "Les changements de médias deviennent visibles sur le site après enregistrement." : "Vos médias restent absents de la galerie publique jusqu’à la publication de la fiche."}</p>
    <form onSubmit={upload} className="mt-5 grid gap-4 border border-navy/15 bg-white p-4 sm:grid-cols-2 lg:grid-cols-3"><label className="grid gap-2 text-sm font-semibold text-navy">Fichier *<input name="file" type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" required className="input min-w-0" disabled={busy} /></label><input type="hidden" name="realisationId" value={selected} /><label className="grid gap-2 text-sm font-semibold text-navy">Rôle du visuel<select name="role" value={role} onChange={event => setRole(event.target.value as GalleryRole)} className="input" disabled={busy}>{Object.entries(labels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label className="grid gap-2 text-sm font-semibold text-navy">Titre<input name="title" maxLength={160} placeholder="Ex. Vue du séjour" className="input" disabled={busy} /></label><label className="grid gap-2 text-sm font-semibold text-navy sm:col-span-2">Description pour l’accessibilité<input name="alt" maxLength={300} placeholder="Décrivez les détails visibles sur cette photo" className="input" disabled={busy} /></label><button disabled={busy} className="inline-flex min-h-12 items-center justify-center gap-2 self-end bg-navy px-5 text-sm font-semibold text-white disabled:opacity-40"><Upload size={17} /> {busy ? "Enregistrement…" : "Ajouter le média"}</button><p className="text-xs leading-6 text-ink/50 sm:col-span-2 lg:col-span-3">JPEG, PNG, WebP, MP4 ou WebM · 50 Mo maximum. Les grandes images sont optimisées avant l’envoi. Une vidéo se range dans la galerie.</p></form>
    <div className="mt-6 border-y border-navy/15 py-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><h3 className="font-semibold text-navy">La comparaison avant / après</h3><p className="mt-2 max-w-2xl text-sm leading-7 text-ink/60">Une photo « Avant » et une photo « Après » du même espace, idéalement au même angle. Les autres médias restent dans le diaporama.</p><p className="mt-2 text-sm text-ink/65">Avant : {before ? "photo associée" : "à ajouter"} · Après : {after ? "photo associée" : "à ajouter"} · {comparisonConfirmed ? "Comparaison activée" : "Comparaison non activée"}</p></div>{before && after && <button type="button" disabled={busy} onClick={() => void update(before, { comparisonConfirmed: !comparisonConfirmed })} className="inline-flex min-h-12 items-center gap-2 border border-navy/20 px-4 text-sm font-semibold text-navy disabled:opacity-40"><CheckCircle2 size={16} />{comparisonConfirmed ? "Désactiver la comparaison" : "Confirmer : c’est le même espace"}</button>}</div></div>
    <p className="mt-6 text-sm text-ink/60">{shown.length} média(s) · l’ordre ci-dessous est celui du diaporama</p><div className="mt-4 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{shown.map((asset, index) => <article key={asset.id} className="overflow-hidden border border-navy/15 bg-white"><div className="relative aspect-video bg-navy">{asset.kind === "video" ? <video src={asset.url} controls playsInline preload="metadata" className="h-full w-full object-contain" /> : <Image src={asset.url} alt={asset.alt || asset.title || "Photo du chantier"} fill sizes="(max-width: 767px) 100vw, 33vw" className="object-cover" />}<span className="absolute left-3 top-3 bg-pearl px-2 py-1 text-xs font-semibold text-navy">{index + 1} / {labels[asset.role]}</span>{asset.cover && <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 bg-navy px-2 py-1 text-xs text-white"><Star size={13} />Couverture</span>}</div><div className="p-4"><div className="flex items-start justify-between gap-3"><p className="font-semibold text-navy">{asset.title || "Média sans titre"}</p>{asset.kind === "video" ? <Video size={17} className="shrink-0 text-champagne" /> : <ImagePlus size={17} className="shrink-0 text-champagne" />}</div><p className="mt-2 text-xs leading-6 text-ink/60">{asset.alt || "Ajoutez une description pour l’accessibilité."}</p><label className="mt-3 grid gap-2 text-xs font-semibold text-navy">Placer ce visuel<select value={asset.role} disabled={busy} onChange={event => void update(asset, { role: event.target.value as GalleryRole })} className="input">{Object.entries(labels).filter(([key]) => asset.kind === "image" || key === "gallery").map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={busy || index === 0} onClick={() => void update(asset, { move: "up" })} aria-label="Déplacer le média vers le début" className="inline-flex h-11 w-11 items-center justify-center border border-navy/15 disabled:opacity-35"><ArrowUp size={16} /></button><button type="button" disabled={busy || index === shown.length - 1} onClick={() => void update(asset, { move: "down" })} aria-label="Déplacer le média vers la fin" className="inline-flex h-11 w-11 items-center justify-center border border-navy/15 disabled:opacity-35"><ArrowDown size={16} /></button><button type="button" disabled={busy || asset.cover || asset.kind !== "image"} onClick={() => void update(asset, { cover: true })} className="inline-flex min-h-11 items-center gap-2 border border-navy/15 px-3 text-xs font-semibold text-navy disabled:opacity-35"><Star size={14} />Couverture</button><button type="button" disabled={busy} onClick={() => setEditing(asset)} className="inline-flex min-h-11 items-center gap-2 border border-navy/15 px-3 text-xs font-semibold text-navy disabled:opacity-35"><Pencil size={14} />Description</button><button type="button" disabled={busy} onClick={() => void remove(asset)} className="inline-flex min-h-11 items-center gap-2 border border-red-200 px-3 text-xs font-semibold text-red-700 disabled:opacity-35"><Trash2 size={14} />Supprimer</button></div>{editing?.id === asset.id && <form onSubmit={event => { event.preventDefault(); void update(asset, { title: editing.title ?? "", alt: editing.alt ?? "" }); }} className="mt-4 grid gap-3 border-t border-navy/15 pt-4"><label className="grid gap-2 text-xs font-semibold text-navy">Titre<input value={editing.title ?? ""} onChange={event => setEditing({ ...editing, title: event.target.value })} maxLength={160} className="input" /></label><label className="grid gap-2 text-xs font-semibold text-navy">Description du visuel<textarea value={editing.alt ?? ""} onChange={event => setEditing({ ...editing, alt: event.target.value })} maxLength={300} className="input min-h-24" /></label><div className="flex gap-2"><button disabled={busy} className="min-h-11 bg-navy px-4 text-xs font-semibold text-white">Enregistrer</button><button type="button" onClick={() => setEditing(null)} aria-label="Annuler la modification" className="inline-flex h-11 w-11 items-center justify-center border border-navy/15"><X size={16} /></button></div></form>}</div></article>)}</div>{!shown.length && <p className="border-b border-navy/15 py-10 text-sm text-ink/60">Cette fiche attend ses premiers visuels. Ajoutez une photo pour préparer la publication.</p>}</>}
  </section>;
}
