import Link from "next/link";
import { PriceEditor } from "@/components/admin/PriceEditor";

export default function PricesPage() {
  return <main className="min-h-screen bg-pearl py-8 sm:py-12"><div className="container"><Link href="/admin" className="text-sm font-semibold text-ink/60">Retour au pilotage</Link><div className="mt-6 flex flex-wrap items-end justify-between gap-5"><div><p className="text-xs font-semibold uppercase tracking-[.2em] text-champagne">A2E / Gestion des prix</p><h1 className="mt-3 text-3xl font-semibold tracking-tight text-navy sm:text-4xl">Votre base de chiffrage.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-ink/65">Maintenez vos prestations, preparez un fichier de prix et faites evoluer le catalogue qui alimente vos estimations.</p></div><Link href="/admin/cotations" className="inline-flex min-h-11 items-center rounded-lg bg-navy px-5 py-3 text-sm font-semibold text-white">Ouvrir l'atelier de cotation</Link></div><PriceEditor /></div></main>;
}
