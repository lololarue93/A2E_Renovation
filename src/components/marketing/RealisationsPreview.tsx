import Image from "next/image";
import { ArrowUpRight, MapPin, Play } from "lucide-react";
import { prisma } from "@/lib/db/prisma";
import { getPublicRealisations } from "@/lib/realisations/catalog";

export async function RealisationsPreview({ limit = 3 }: { limit?: number }) {
  const [assets, catalog] = await Promise.all([
    prisma.mediaAsset.findMany({ orderBy: { createdAt: "desc" }, take: 100 }).catch(() => []),
    getPublicRealisations()
  ]);
  return <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{catalog.slice(0, limit).map((item, index) => {
    const projectAssets = assets.filter((asset) => asset.realisationId === `demo-realisation-${index}`).slice(0, 4);
    const cover = projectAssets[0];
    return <article key={item.title} className="group overflow-hidden rounded-card border border-ink/10 bg-white shadow-[0_18px_50px_rgba(5,22,55,.07)]"><div className="relative aspect-[4/3] overflow-hidden bg-navy">{cover?.kind === "video" ? <video src={cover.url} muted loop playsInline controls preload="metadata" className="h-full w-full object-cover" /> : cover?.url ? <Image src={cover.url} alt={cover.alt ?? item.title} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover transition duration-500 group-hover:scale-105" /> : <><div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(7,26,51,.95),rgba(185,170,138,.82))]" /><div className="relative grid h-full place-items-center text-center text-white"><div><p className="text-sm font-bold uppercase tracking-[.16em]">Projet A2E</p><p className="mt-2 text-5xl font-black">{String(index + 1).padStart(2, "0")}</p></div></div></>}{cover?.kind === "video" && <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-card bg-white/90 px-2 py-1 text-xs font-black text-navy"><Play size={12} fill="currentColor" /> Video</span>}</div><div className="p-5"><p className="flex items-center gap-2 text-sm font-bold text-champagne"><MapPin size={16} /> {item.city} · {item.type}</p><h3 className="mt-2 text-xl font-black leading-tight text-navy">{item.title}</h3><p className="mt-3 text-sm leading-6 text-ink/65">{item.description}</p><p className="mt-3 text-sm font-bold text-ink/55">{item.duration} · {item.budget}</p>{projectAssets.length > 1 && <div className="mt-4 grid grid-cols-3 gap-2">{projectAssets.slice(1, 4).map((asset) => asset.kind === "video" ? <div key={asset.id} className="grid aspect-square place-items-center rounded-card bg-navy text-white"><Play size={18} fill="currentColor" /></div> : <Image key={asset.id} src={asset.url} alt={asset.alt ?? item.title} width={120} height={80} className="aspect-square rounded-card object-cover" />)}</div>}<div className="mt-4 flex flex-wrap gap-2">{item.tags.map((tag) => <span key={tag} className="rounded-card bg-mist px-2 py-1 text-xs font-bold text-ink/70">{tag}</span>)}</div><a href="/contact" className="mt-5 inline-flex items-center gap-2 text-sm font-black text-navy transition group-hover:text-champagne">Parler d'un projet similaire <ArrowUpRight size={16} /></a></div></article>;
  })}</div>;
}
