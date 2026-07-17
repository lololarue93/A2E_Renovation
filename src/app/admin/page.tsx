import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { priceItems } from "@/lib/pricing/price-data";
import { realisations, team, trustBadges } from "@/lib/site-data";
import { PriceEditor } from "@/components/admin/PriceEditor";
import { NotificationSettings } from "@/components/admin/NotificationSettings";
import { RealisationMediaManager } from "@/components/admin/RealisationMediaManager";
import { LeadExports } from "@/components/admin/LeadExports";
import { SeoAdminPanel } from "@/components/admin/SeoAdminPanel";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [leads, eventCounts, recentViews, consentedLeads, projectCounts, statusCounts, auditLogs] = process.env.DATABASE_URL
    ? await Promise.all([
        prisma.lead.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { estimates: { orderBy: { createdAt: "desc" }, take: 1 } } }).catch(() => []),
        prisma.siteEvent.groupBy({ by: ["event"], _count: { _all: true }, where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } }).catch(() => []),
        prisma.siteEvent.count({ where: { event: "page_view", createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } }).catch(() => 0),
        prisma.lead.count({ where: { consent: true } }).catch(() => 0),
        prisma.lead.groupBy({ by: ["typeProjet"], where: { consent: true }, _count: { _all: true }, orderBy: { _count: { typeProjet: "desc" } } }).catch(() => []),
        prisma.lead.groupBy({ by: ["status"], where: { consent: true }, _count: { _all: true } }).catch(() => []),
        prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 6 }).catch(() => [])
      ])
    : [[], [], 0, 0, [], [], []];
  const countFor = (event: string) => eventCounts.find((item) => item.event === event)?._count._all ?? 0;
  const conversionRate = recentViews ? Math.round((countFor("lead_submitted") / recentViews) * 1000) / 10 : 0;

  return (
    <main className="min-h-screen bg-mist py-10">
      <div className="container">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div><p className="font-black uppercase tracking-[.18em] text-champagne">Admin auditeur</p><h1 className="text-4xl font-black text-navy">Pilotage A2E</h1><p className="mt-2 text-sm text-ink/60">Leads, visibilité, notifications, contenus et maintenance.</p></div>
          <div className="flex flex-wrap gap-2"><a href="#notifications" className="min-h-11 rounded-card border border-navy/15 px-4 py-3 font-black text-navy">Notifications</a><a href="#pipeline" className="min-h-11 rounded-card border border-navy/15 px-4 py-3 font-black text-navy">Pipeline</a><Link href="/" className="min-h-11 rounded-card bg-navy px-4 py-3 font-black text-white">Voir le site</Link></div>
        </div>
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Visites 30 jours" value={recentViews.toLocaleString("fr-FR")} /><Metric label="Demarrages simulateur" value={countFor("quote_started").toLocaleString("fr-FR")} /><Metric label="Leads qualifies" value={countFor("lead_submitted").toLocaleString("fr-FR")} /><Metric label="Conversion visite vers lead" value={`${conversionRate.toLocaleString("fr-FR")} %`} /></section>
        <section id="pipeline" className="mt-8 grid gap-5 lg:grid-cols-[1.2fr_.8fr]"><div className="a2e-card p-6"><div className="flex items-center justify-between gap-3"><div><p className="font-black uppercase tracking-[.16em] text-champagne">Pipeline qualifie</p><h2 className="mt-2 text-2xl font-black text-navy">Leads ayant accepte le contact</h2></div><strong className="text-3xl font-black text-navy">{consentedLeads}</strong></div><div className="mt-5 grid gap-2 sm:grid-cols-2">{statusCounts.length === 0 ? <p className="text-sm text-ink/60">Les statuts apparaitront apres les premiers leads.</p> : statusCounts.map((item) => <div key={item.status} className="flex justify-between rounded-card bg-pearl px-4 py-3 text-sm"><span className="font-bold text-ink/70">{item.status}</span><strong className="text-navy">{item._count._all}</strong></div>)}</div></div><div className="a2e-card p-6"><p className="font-black uppercase tracking-[.16em] text-champagne">Demande</p><h2 className="mt-2 text-2xl font-black text-navy">Projets les plus demandes</h2><div className="mt-5 space-y-2">{projectCounts.length === 0 ? <p className="text-sm text-ink/60">Pas encore de donnees.</p> : projectCounts.map((item) => <div key={item.typeProjet} className="flex justify-between rounded-card border border-ink/10 px-4 py-3 text-sm"><span className="font-bold text-ink/70">{item.typeProjet}</span><strong className="text-navy">{item._count._all}</strong></div>)}</div></div></section>
        <div className="mt-8 grid gap-5 lg:grid-cols-3"><AdminCard title="Leads" value={`${leads.length} derniers leads`} items={["Nouveau", "A rappeler", "Visite a planifier", "Devis envoye"]} /><AdminCard title="Visibilite" value="SEO et acquisition" items={["Sitemap XML", "Donnees structurees", "Pages Ile-de-France", "Suivi Search Console"]} /><AdminCard title="Maintenance" value="Audit de production" items={["Healthcheck Docker", "Journal admin", "Dependances GitHub", "Alertes securite"]} /></div>
        <section className="mt-8 a2e-card p-6"><h2 className="text-2xl font-black text-navy">Derniers leads</h2><div className="mt-4 grid gap-3">{leads.length === 0 ? <p className="rounded-card bg-pearl p-4 text-sm font-bold text-ink/65">Aucun lead pour le moment.</p> : leads.map((lead) => <div key={lead.id} className="grid gap-3 rounded-card bg-pearl p-4 md:grid-cols-[1fr_auto]"><div><p className="font-black text-navy">{lead.name}</p><p className="text-sm text-ink/65">{lead.phone} · {lead.email} · {lead.city ?? "Zone non renseignee"}</p><p className="mt-1 text-sm font-bold text-champagne">{lead.typeProjet} · {lead.status} · {lead.consent ? "Contact accepte" : "Sans consentement"}</p></div><div className="text-left md:text-right"><p className="font-black text-navy">{(lead.estimates[0]?.mid ?? lead.budget ?? 0).toLocaleString("fr-FR")} EUR</p><p className="text-xs text-ink/55">{lead.createdAt.toLocaleDateString("fr-FR")}</p></div></div>)}</div></section>
        <section className="mt-8 a2e-card p-6"><h2 className="text-2xl font-black text-navy">Prix de demonstration</h2><div className="mt-4 grid gap-2">{priceItems.slice(0, 12).map((item) => <div className="grid gap-2 rounded-card bg-pearl p-3 text-sm md:grid-cols-[1fr_auto]" key={item.key}><span className="font-bold">{item.label}</span><span>{item.low} / {item.mid} / {item.high} EUR {item.unit}</span></div>)}</div></section>
        <PriceEditor /><NotificationSettings /><LeadExports /><SeoAdminPanel /><RealisationMediaManager />
        <section className="mt-8 a2e-card p-6"><div className="flex items-center justify-between gap-3"><div><p className="font-black uppercase tracking-[.16em] text-champagne">Audit et maintenance</p><h2 className="mt-2 text-2xl font-black text-navy">Journal des actions sensibles</h2></div><span className="rounded-card bg-pearl px-3 py-2 text-xs font-black text-ink/65">{auditLogs.length} evenements</span></div><div className="mt-4 space-y-2">{auditLogs.length === 0 ? <p className="text-sm text-ink/60">Aucune action admin enregistree.</p> : auditLogs.map((item) => <div key={item.id} className="flex flex-wrap justify-between gap-2 rounded-card bg-pearl px-4 py-3 text-sm"><span className="font-bold text-navy">{item.action} · {item.entity}</span><time className="text-ink/55">{item.createdAt.toLocaleString("fr-FR")}</time></div>)}</div><p className="mt-5 text-xs leading-5 text-ink/55">Les mises a jour Docker, dependances et alertes de securite sont validees depuis GitHub Actions et Portainer. Les secrets ne sont jamais stockes dans Git.</p></section>
        <div className="mt-8 grid gap-5 md:grid-cols-3"><AdminCard title="Realisations" value={`${realisations.length} demos`} items={realisations.map((item) => item.title)} /><AdminCard title="Equipe" value={`${team.length} profils`} items={team.map((item) => item.name)} /><AdminCard title="Badges confiance" value={`${trustBadges.length} badges`} items={trustBadges.map((item) => item.label)} /></div>
      </div>
    </main>
  );
}

function AdminCard({ title, value, items }: { title: string; value: string; items: string[] }) { return <div className="a2e-card p-5"><h2 className="text-xl font-black text-navy">{title}</h2><p className="mt-2 font-bold text-champagne">{value}</p><ul className="mt-4 space-y-2 text-sm text-ink/68">{items.slice(0, 6).map((item) => <li key={item}>- {item}</li>)}</ul></div>; }
function Metric({ label, value }: { label: string; value: string }) { return <div className="a2e-card p-5"><p className="text-sm font-bold text-ink/60">{label}</p><p className="mt-2 text-3xl font-black text-navy">{value}</p><p className="mt-1 text-xs text-champagne">30 derniers jours</p></div>; }
