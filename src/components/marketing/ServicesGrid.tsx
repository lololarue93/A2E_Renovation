import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { services } from "@/lib/site-data";

export function ServicesGrid() {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
      {services.map((service) => (
        <Link
          href={`/services/${service.slug}`}
          key={service.slug}
          className="a2e-card group flex min-h-[24rem] flex-col p-5 transition hover:-translate-y-1 hover:shadow-premium"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-card bg-pearl text-champagne">
            <service.icon size={28} />
          </div>
          <h3 className="mt-5 text-xl font-black leading-tight text-navy">{service.title}</h3>
          <p className="mt-3 text-sm leading-6 text-ink/68">{service.excerpt}</p>
          <ul className="mt-5 space-y-2 text-sm font-bold text-ink/72">
            {service.bullets.map((bullet) => (
              <li key={bullet} className="flex gap-2">
                <Check size={16} className="mt-0.5 shrink-0 text-champagne" />
                {bullet}
              </li>
            ))}
          </ul>
          <div className="mt-5 rounded-card bg-pearl p-3">
            <p className="text-xs font-black uppercase tracking-[.14em] text-ink/45">Pack cadré</p>
            <p className="mt-1 text-sm font-bold leading-6 text-navy">{service.packs.slice(0, 3).join(" · ")}</p>
          </div>
          <span className="mt-auto inline-flex min-h-11 items-center gap-2 pt-5 text-sm font-black text-navy">
            Découvrir <ArrowRight size={16} className="transition group-hover:translate-x-1" />
          </span>
        </Link>
      ))}
    </div>
  );
}
