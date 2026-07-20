"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ImagePlus, Pencil, Trash2, Upload, Video } from "lucide-react";

type Asset = { id: string; kind: "image" | "video"; url: string; title?: string | null; alt?: string | null; realisationId?: string | null; realisation?: { title: string } | null };
type Realisation = { id: string; title: string };

export function RealisationMediaManager() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [realisations, setRealisations] = useState<Realisation[]>([]);
  const [status, setStatus] = useState("Chargement de la bibliotheque...");
  const [selectedRealisation, setSelectedRealisation] = useState("");

  async function load() {
    const response = await fetch("/api/admin/media", { cache: "no-store" });
    if (!response.ok) throw new Error("Bibliotheque indisponible");
    const data = await response.json();
    setAssets(data.assets ?? []);
    setRealisations(data.realisations ?? []);
    setStatus("");
  }

  useEffect(() => { load().catch(() => setStatus("Bibliotheque indisponible")); }, []);

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setStatus("Upload en cours...");
    const response = await fetch("/api/admin/media", { method: "POST", body: form });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { setStatus(data.error ?? "Upload impossible"); return; }
    event.currentTarget.reset();
    setSelectedRealisation("");
    await load();
    setStatus("Media ajoute et associe");
  }

  async function edit(asset: Asset) {
    const title = window.prompt("Titre du media", asset.title ?? "");
    if (title === null) return;
    const alt = window.prompt("Texte alternatif", asset.alt ?? asset.title ?? "");
    if (alt === null) return;
    const response = await fetch("/api/admin/media", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: asset.id, title, alt, realisationId: asset.realisationId }) });
    if (response.ok) { await load(); setStatus("Media mis a jour"); } else setStatus("Modification impossible");
  }

  async function remove(asset: Asset) {
    if (!window.confirm(`Supprimer ${asset.title ?? "ce media"} ?`)) return;
    const response = await fetch(`/api/admin/media?id=${encodeURIComponent(asset.id)}`, { method: "DELETE" });
    if (response.ok) { setAssets((current) => current.filter((item) => item.id !== asset.id)); setStatus("Media supprime"); } else setStatus("Suppression impossible");
  }

  return <section className="mt-8 a2e-card p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="font-black uppercase tracking-[.16em] text-champagne">Contenus chantier</p><h2 className="mt-2 text-2xl font-black text-navy">Realisations : photos et videos</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-ink/65">Associez chaque media a une realisation, donnez-lui un titre et un texte alternatif. Les contenus rattaches sont regroupes automatiquement cote public.</p></div><span className="rounded-card bg-pearl px-3 py-2 text-sm font-black text-navy">{assets.length} media</span></div><form onSubmit={upload} className="mt-6 grid gap-3 rounded-card border border-ink/10 bg-pearl p-4 lg:grid-cols-[1.2fr_1fr_1fr_auto]"><input name="file" type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" required className="input" /><select name="realisationId" value={selectedRealisation} onChange={(event) => setSelectedRealisation(event.target.value)} required className="input"><option value="">Choisir une realisation *</option>{realisations.map((item) => <option value={item.id} key={item.id}>{item.title}</option>)}</select><input name="title" placeholder="Titre du media" className="input" /><input name="alt" placeholder="Texte alternatif" className="input" /><button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-card bg-navy px-5 font-black text-white"><Upload size={16} /> Ajouter</button></form><p className="mt-3 min-h-5 text-sm font-bold text-champagne">{status}</p><div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{assets.map((asset) => <article key={asset.id} className="overflow-hidden rounded-card border border-ink/10 bg-white"><div className="relative aspect-video bg-navy">{asset.kind === "video" ? <video src={asset.url} controls preload="metadata" className="h-full w-full object-cover" /> : <img src={asset.url} alt={asset.alt ?? asset.title ?? "Realisation A2E"} className="h-full w-full object-cover" />}</div><div className="p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-black text-navy">{asset.title ?? "Media sans titre"}</p><p className="mt-1 text-xs font-bold text-champagne">{asset.realisation?.title ?? realisations.find((item) => item.id === asset.realisationId)?.title ?? "Non associe"}</p></div>{asset.kind === "video" ? <Video size={17} className="text-champagne" /> : <ImagePlus size={17} className="text-champagne" />}</div><div className="mt-3 flex gap-2"><button type="button" onClick={() => edit(asset)} className="inline-flex min-h-10 items-center gap-2 rounded-card border border-navy/15 px-3 text-xs font-black text-navy"><Pencil size={14} /> Modifier</button><button type="button" onClick={() => remove(asset)} className="inline-flex min-h-10 items-center gap-2 rounded-card border border-red-200 px-3 text-xs font-black text-red-700"><Trash2 size={14} /> Supprimer</button></div></div></article>)}</div></section>;
}
