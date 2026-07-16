import { MapPin } from "lucide-react";
import { realisations } from "@/lib/site-data";

export function RealisationsPreview({ limit = 3 }: { limit?: number }) {
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {realisations.slice(0, limit).map((item, index) => (
        <article key={item.title} className="a2e-card overflow-hidden">
          <div className="relative grid aspect-[4/3] place-items-center overflow-hidden bg-navy text-white">
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(7,26,51,.95),rgba(215,180,106,.82))]" />
            <div className="relative text-center">
              <p className="text-sm font-bold uppercase tracking-[.16em]">Avant / Après</p>
              <p className="mt-2 text-5xl font-black">{String(index + 1).padStart(2, "0")}</p>
            </div>
          </div>
          <div className="p-5">
            <p className="flex items-center gap-2 text-sm font-bold text-champagne">
              <MapPin size={16} /> {item.city} · {item.type}
            </p>
            <h3 className="mt-2 text-xl font-black leading-tight text-navy">{item.title}</h3>
            <p className="mt-3 text-sm font-bold text-ink/65">{item.duration} · {item.budget}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {item.tags.map((tag) => <span key={tag} className="rounded-card bg-mist px-2 py-1 text-xs font-bold text-ink/70">{tag}</span>)}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
