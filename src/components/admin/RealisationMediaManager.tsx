"use client";

import Image from "next/image";
import { FormEvent, useEffect, useState } from "react";
import { ImagePlus, Pencil, Trash2, Upload, Video } from "lucide-react";

type Asset = { id: string; kind: string; url: string; title?: string | null; alt?: string | null; realisationId?: string | null; realisation?: { title: string } | null };
type Realisation = { id: string; title: string };

async function compressImage(file: File) {
  if (!file.type.startsWith("image/") || file.size < 1_500_000) return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 2200 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.82));
  bitmap.close();
  return blob ? new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), { type: "image/webp" }) : file;
}

export function RealisationMediaManager() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [realisations, setRealisations] = useState<Realisation[]>([]);
  const [selectedRealisation, setSelectedRealisation] = useState("");
  const [status, setStatus] = useState("Chargement de la bibliothèque...");
  const load = async () => { const response = await fetch(`/api/admin/media?refresh=${Date.now()}`, { cache: "no-store" }); const data = await response.json(); setAssets(data.assets ?? []); setRealisations(data.realisations ?? []); setStatus(`${(data.assets ?? []).length} média(s) enregistrés`); };
  useEffect(() => { load().catch(() => setStatus("Impossible de charger la bibliothèque")); }, []);
  async function upload(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); const original = form.get("file"); if (!(original instanceof File)) return; setStatus("Optimisation et envoi du média..."); form.set("file", await compressImage(original)); const response = await fetch("/api/admin/media", { method: "POST", body: form }); if (!response.ok) { setStatus((await response.json().catch(() => ({}))).error ?? "Échec de l'envoi"); return; } event.currentTarget.reset(); setSelectedRealisation(""); setStatus("Média publié et associé"); await load(); }
  async function edit(asset: Asset) { const title = window.prompt("Titre du média", asset.title ?? ""); if (title === null) return; const alt = window.prompt("Texte alternatif", asset.alt ?? "") ?? ""; const realisationId = window.prompt("ID de la réalisation (laisser vide pour dissocier)", asset.realisationId ?? "") ?? ""; const response = await fetch("/api/admin/media", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: asset.id, title, alt, realisationId }) }); setStatus(response.ok ? "Média mis à jour" : "Échec de la mise à jour"); if (response.ok) await load(); }
  async function remove(asset: Asset) { if (!window.confirm(`Supprimer ${asset.title ?? "ce média"} ?`)) return; const response = await fetch(`/api/admin/media?id=${encodeURIComponent(asset.id)}`, { method: "DELETE" }); setStatus(response.ok ? "Média supprimé" : "Échec de la suppression"); if (response.ok) await load(); }
  return <section className="mt-8 a2e-card p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="font-black uppercase tracking-[.16em] text-champagne">Contenus chantier</p><h2 className="mt-2 text-2xl font-black text-navy">Photos et vidéos publiées</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-ink/65">Le fichier est optimisé avant l'envoi, associé à une réalisation puis visible publiquement après rechargement de la galerie.</p></div><span className="rounded-card bg-pearl px-3 py-2 text-sm font-black text-navy">{assets.length} média(s)</span></div><form onSubmit={upload} className="mt-6 grid gap-3 rounded-card border border-ink/10 bg-pearl p-4 lg:grid-cols-[1.2fr_1fr_1fr_1fr_auto]"><input name="file" type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" required className="input" /><select name="realisationId" value={selectedRealisation} onChange={(event) => setSelectedRealisation(event.target.value)} required className="input"><option value="">Choisir une réalisation *</option>{realisations.map((item) => <option value={item.id} key={item.id}>{item.title}</option>)}</select><input name="title" placeholder="Titre du média" className="input" /><input name="alt" placeholder="Texte alternatif" className="input" /><button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-card bg-navy px-5 font-black text-white"><Upload size={16} /> Publier</button></form><p className="mt-3 min-h-5 text-sm font-bold text-champagne">{status}</p><div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{assets.map((asset) => <article key={asset.id} className="overflow-hidden rounded-card border border-ink/10 bg-white"><div className="relative aspect-video bg-navy">{asset.kind === "video" ? <video src={asset.url} controls preload="metadata" className="h-full w-full object-cover" /> : <Image src={asset.url} alt={asset.alt ?? asset.title ?? "Réalisation A2E"} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />}</div><div className="p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-black text-navy">{asset.title ?? "Média sans titre"}</p><p className="mt-1 text-xs font-bold text-champagne">{asset.realisation?.title ?? realisations.find((item) => item.id === asset.realisationId)?.title ?? "Non associé"}</p></div>{asset.kind === "video" ? <Video size={17} className="text-champagne" /> : <ImagePlus size={17} className="text-champagne" />}</div><div className="mt-3 flex gap-2"><button type="button" onClick={() => edit(asset)} className="inline-flex min-h-10 items-center gap-2 rounded-card border border-navy/15 px-3 text-xs font-black text-navy"><Pencil size={14} /> Modifier</button><button type="button" onClick={() => remove(asset)} className="inline-flex min-h-10 items-center gap-2 rounded-card border border-red-200 px-3 text-xs font-black text-red-700"><Trash2 size={14} /> Supprimer</button></div></div></article>)}</div></section>;
}
