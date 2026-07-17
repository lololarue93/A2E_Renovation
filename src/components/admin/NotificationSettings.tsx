import { NotificationPreferences } from "@/components/admin/NotificationPreferences";

const configured = Boolean(process.env.BREVO_API_KEY && process.env.BREVO_SENDER_EMAIL && process.env.LEAD_NOTIFICATION_EMAIL);

export function NotificationSettings() {
  return (
    <section id="notifications" className="mt-8 a2e-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-black uppercase tracking-[.16em] text-champagne">Menu notifications</p>
          <h2 className="mt-2 text-2xl font-black text-navy">Leads, PDF et email Julien</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/65">Chaque demande de PDF peut notifier Julien avec le nom, les coordonnées, la fourchette et le PDF en pièce jointe. Les secrets restent dans Portainer.</p>
        </div>
        <span className={`rounded-card px-3 py-2 text-sm font-black ${configured ? "bg-green-100 text-green-800" : "bg-pearl text-ink/65"}`}>
          {configured ? "Brevo configure" : "Configuration a terminer"}
        </span>
      </div>

      <NotificationPreferences />

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-card border border-champagne/35 bg-pearl p-5">
          <h3 className="font-black text-navy">Option recommandee : Brevo API</h3>
          <p className="mt-2 text-sm leading-6 text-ink/65">Bonne option pour les pre-devis : pas de port SMTP a ouvrir et suivi des envois depuis Brevo.</p>
          <dl className="mt-4 space-y-2 text-sm">
            <SettingRow name="BREVO_API_KEY" state={Boolean(process.env.BREVO_API_KEY)} secret />
            <SettingRow name="BREVO_SENDER_EMAIL" state={Boolean(process.env.BREVO_SENDER_EMAIL)} />
            <SettingRow name="LEAD_NOTIFICATION_EMAIL" state={Boolean(process.env.LEAD_NOTIFICATION_EMAIL)} />
          </dl>
        </div>
        <div className="rounded-card border border-ink/10 bg-white p-5">
          <h3 className="font-black text-navy">Option OVH SMTP</h3>
          <p className="mt-2 text-sm leading-6 text-ink/65">Possible si la boite d'envoi est chez OVH. Le serveur MX Plan utilise generalement SSL/TLS sur le port 465 avec l'adresse email complete comme identifiant.</p>
          <p className="mt-3 text-xs font-bold text-champagne">Cette option necessite une validation technique SMTP avant activation dans l'application.</p>
          <a className="mt-4 inline-flex font-black text-navy underline" href="https://help.ovhcloud.com/csm/en-mx-plan-android-gmail-configuration?id=kb_article_view&sysparm_article=KB0052042" target="_blank" rel="noreferrer">Voir la documentation OVH</a>
        </div>
      </div>

      <details className="mt-5 rounded-card border border-ink/10 bg-white p-5">
        <summary className="cursor-pointer font-black text-navy">Tutoriel Brevo : renseigner le compte</summary>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-6 text-ink/70">
          <li>Dans Brevo, valide l'adresse ou le domaine qui servira d'expéditeur.</li>
          <li>Ouvre <strong>Settings / API Keys</strong> et crée une clé API v3.</li>
          <li>Dans Portainer, ouvre la stack <strong>a2e</strong>, puis les variables d'environnement.</li>
          <li>Ajoute les quatre variables ci-dessous sans publier la clé dans GitHub.</li>
          <li>Redéploie la stack et vérifie la réception du PDF chez Julien.</li>
        </ol>
        <pre className="mt-4 overflow-x-auto rounded-card bg-navy p-4 text-xs leading-6 text-white">{`BREVO_API_KEY=...\nBREVO_SENDER_EMAIL=contact@ags-a2e.com\nBREVO_SENDER_NAME=A2E Renovation\nLEAD_NOTIFICATION_EMAIL=julien.c@ags-a2e.com`}</pre>
        <div className="mt-4 flex flex-wrap gap-4 text-sm font-black">
          <a className="text-navy underline" href="https://app.brevo.com/settings/keys/api" target="_blank" rel="noreferrer">Ouvrir les cles API Brevo</a>
          <a className="text-navy underline" href="https://help.brevo.com/hc/en-us/articles/360020997480" target="_blank" rel="noreferrer">Aide Brevo expéditeur</a>
        </div>
      </details>
    </section>
  );
}

function SettingRow({ name, state, secret = false }: { name: string; state: boolean; secret?: boolean }) {
  return <div className="flex items-center justify-between gap-3"><dt className="font-mono text-xs text-ink/70">{name}</dt><dd className={`text-xs font-black ${state ? "text-green-700" : "text-ink/45"}`}>{state ? (secret ? "Renseignee" : "Active") : "Manquante"}</dd></div>;
}
