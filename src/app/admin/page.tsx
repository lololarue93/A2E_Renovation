import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { priceItems } from "@/lib/pricing/price-data";
import { realisations, team, trustBadges } from "@/lib/site-data";
import { PriceEditor } from "@/components/admin/PriceEditor";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [leads, eventCounts, recentViews] = process.env.DATABASE_URL
    ? await Promise.all([
        prisma.lead.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { estimates: { orderBy: { createdAt: "desc" }, take: 1 } } }).catch(() => []),
        prisma.siteEvent.groupBy({ by: ["event"], _count: { _all: true }, where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } }).catch(() => []),
        prisma.siteEvent.count({ where: { event: "page_view", createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } }).catch(() => 0)
      ])
    : [[], [], 0];
  const countFor = (event: string) => eventCounts.find((item) => item.event === event)?._count._all ?? 0;
  const conversionRate = recentViews ? Math.round((countFor("lead_submitted") / recentViews) * 1000) / 10 : 0;

  return (
    <main className="min-h-screen bg-mist py-10">
      <div className="container">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div><p className="font-black uppercase tracking-[.18em] text-champagne">Admin</p><h1 className="text-4xl font-black text-navy">Pilotage A2E</h1></div>
          <Link href="/" className="min-h-11 rounded-card bg-navy px-4 py-3 font-black text-white">Voir le site</Link>
        </div>
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Visites 30 jours" value={recentViews.toLocaleString("fr-FR")} />
          <Metric label="Démarrages simulateur" value={countFor("quote_started").toLocaleString("fr-FR")} />
          <Metric label="Leads qualifiés" value={countFor("lead_submitted").toLocaleString("fr-FR")} />
          <Metric label="Conversion visite → lead" value={`${conversionRate.toLocaleString("fr-FR")} %`} />
        </section>
        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          <AdminCard title="Leads" value={`${leads.length} derniers leads`} items={["Nouveau", "À rappeler", "Visite à planifier", "Devis envoyé"]} />
          <AdminCard title="Branding" value="Modifiable en V2 UI" items={["Logo", "Badge RGE", "Hero", "Couleurs", "QR code"]} />
          <AdminCard title="Suivi" value="First-party, sans cookie tiers" items={["Pages vues", "Clics estimation", "Clics téléphone", "Leads envoyés"]} />
        </div>
        <section className="mt-8 a2e-card p-6">
          <h2 className="text-2xl font-black text-navy">Derniers leads</h2>
          <div className="mt-4 grid gap-3">
            {leads.length === 0 ? <p className="rounded-card bg-pearl p-4 text-sm font-bold text-ink/65">Aucun lead pour le moment.</p> : leads.map((lead) => (
              <div key={lead.id} className="grid gap-3 rounded-card bg-pearl p-4 md:grid-cols-[1fr_auto]">
                <div><p className="font-black text-navy">{lead.name}</p><p className="text-sm text-ink/65">{lead.phone} · {lead.email} · {lead.city ?? "Ville non renseignée"}</p><p className="mt-1 text-sm font-bold text-champagne">{lead.typeProjet} · {lead.status}</p></div>
                <div className="text-left md:text-right"><p className="font-black text-navy">{(lead.estimates[0]?.mid ?? lead.budget ?? 0).toLocaleString("fr-FR")} €</p><p className="text-xs text-ink/55">{lead.createdAt.toLocaleDateString("fr-FR")}</p></div>
              </div>
            ))}
          </div>
        </section>
        <section className="mt-8 a2e-card p-6"><h2 className="text-2xl font-black text-navy">Prix de démonstration</h2><div className="mt-4 grid gap-2">{priceItems.slice(0, 12).map((item) => <div className="grid gap-2 rounded-card bg-pearl p-3 text-sm md:grid-cols-[1fr_auto]" key={item.key}><span className="font-bold">{item.label}</span><span>{item.low} / {item.mid} / {item.high} € {item.unit}</span></div>)}</div></section>
        <PriceEditor />
        <div className="mt-8 grid gap-5 md:grid-cols-3"><AdminCard title="Réalisations" value={`${realisations.length} démos`} items={realisations.map((item) => item.title)} /><AdminCard title="Équipe" value={`${team.length} profils`} items={team.map((item) => item.name)} /><AdminCard title="Badges confiance" value={`${trustBadges.length} badges`} items={trustBadges.map((item) => item.label)} /></div>
      </div>
    </main>
  );
}

function AdminCard({ title, value, items }: { title: string; value: string; items: string[] }) {
  return <div className="a2e-card p-5"><h2 className="text-xl font-black text-navy">{title}</h2><p className="mt-2 font-bold text-champagne">{value}</p><ul className="mt-4 space-y-2 text-sm text-ink/68">{items.slice(0, 6).map((item) => <li key={item}>• {item}</li>)}</ul></div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="a2e-card p-5"><p className="text-sm font-bold text-ink/60">{label}</p><p className="mt-2 text-3xl font-black text-navy">{value}</p><p className="mt-1 text-xs text-champagne">30 derniers jours</p></div>;
}
