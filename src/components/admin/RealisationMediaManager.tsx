"use client";

import { useEffect, useState } from "react";
import * as React from "react";

type Asset = { id: string; kind: string; url: string; title?: string | null; realisation?: { title: string } | null };
type Realisation = { id: string; title: string };

export function RealisationMediaManager() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [realisations, setRealisations] = useState<Realisation[]>([]);
  const [status, setStatus] = useState("Chargement...");
  const [realisationId, setRealisationId] = useState("");
  useEffect(() => { fetch("/api/admin/media").then((response) => response.json()).then((data) => { setAssets(data.assets ?? []); setRealisations(data.realisations ?? []); setStatus(""); }).catch(() => setStatus("Bibliotheque indisponible")); }, []);
  async function upload(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); if (realisationId) form.set("realisationId", realisationId); setStatus("Traitement et upload..."); const response = await fetch("/api/admin/media", { method: "POST", body: form }); if (!response.ok) { setStatus((await response.json()).error ?? "Upload impossible"); return; } const data = await response.json(); setAssets((old) => [data.asset, ...old]); event.currentTarget.reset(); setStatus("Media ajoute"); }
  return <section className="mt-8 a2e-card p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="font-black uppercase tracking-[.16em] text-champagne">Realisations</p><h2 className="mt-2 text-2xl font-black text-navy">Bibliotheque photo et video</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-ink/65">Ajoute des photos JPEG, PNG ou WebP et des videos MP4/WebM. Les images sont servies via Next Image sur le site ; le stockage est conserve dans le volume Docker.</p></div><span className="rounded-card bg-pearl px-3 py-2 text-sm font-black text-navy">{assets.length} media</span></div><form onSubmit={upload} className="mt-6 grid gap-3 rounded-card border border-ink/10 bg-pearl p-4 md:grid-cols-[1fr_1fr_auto]"><input name="file" type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" required className="input" /><select value={realisationId} onChange={(event) => setRealisationId(event.target.value)} className="input"><option value="">Associer a une realisation</option>{realisations.map((item) => <option value={item.id} key={item.id}>{item.title}</option>)}</select><button className="min-h-11 rounded-card bg-navy px-5 font-black text-white">Ajouter le media</button></form><p className="mt-3 text-sm font-bold text-champagne">{status}</p><div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{assets.slice(0, 12).map((asset) => <article key={asset.id} className="overflow-hidden rounded-card border border-ink/10 bg-white">{asset.kind === "video" ? <video src={asset.url} controls preload="metadata" className="aspect-video w-full object-cover" /> : <img src={asset.url} alt={asset.title ?? "Realisation A2E"} className="aspect-video w-full object-cover" />}</article>)}</div></section>;
}
