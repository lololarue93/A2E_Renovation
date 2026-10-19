import { ArrowUpRight } from "lucide-react";
import { NotificationPreferences } from "@/components/admin/NotificationPreferences";

export function NotificationSettings() {
  return <section id="notifications" className="mt-2">
    <div className="flex flex-wrap items-start justify-between gap-5 border-b border-navy/15 pb-6"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-champagne">Vos coordonnées et vos règles</p><h2 className="mt-2 text-2xl font-semibold text-navy">Un site à jour, des échanges suivis.</h2><p className="mt-3 max-w-2xl text-sm leading-7 text-ink/70">Réglez les coordonnées, les événements automatiques et la mesure d’audience. Les boîtes professionnelles, les destinataires et les résultats d’envoi sont réunis dans la messagerie.</p></div><a href="#mail" className="inline-flex min-h-12 items-center gap-2 border border-navy/25 px-4 text-sm font-semibold text-navy">Ouvrir la messagerie <ArrowUpRight size={16} /></a></div>
    <NotificationPreferences />
    <p className="mt-5 text-sm leading-7 text-ink/70">Les paramètres SMTP et les clés des fournisseurs se saisissent depuis Messagerie → Connexions email. Ils sont chiffrés sur le serveur. Les quotas et frais éventuels restent ceux de votre fournisseur.</p>
  </section>;
}
