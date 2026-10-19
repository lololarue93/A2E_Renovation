import { trustBadges } from "@/lib/site-data";

export function TrustBadges() {
  return (
    <div><div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
      {trustBadges.map((badge) => (
        <div key={badge.label} className="border-t border-navy/15 pt-5">
          <badge.icon className="text-champagne" size={24} />
          <p className="mt-3 font-black text-navy">{badge.label}</p>
          <p className="mt-1 text-sm text-ink/62">{badge.note}</p>
        </div>
      ))}
    </div><p className="mt-7 max-w-3xl text-xs leading-6 text-ink/60">Pour un chantier concerné par la qualification RGE, demandez le certificat, vérifiez sa période de validité et les domaines de travaux de l'entreprise qui intervient. <a className="font-bold text-navy underline" href="https://france-renov.gouv.fr/annuaire-rge/identifier" target="_blank" rel="noreferrer">Vérifier dans l'annuaire France Rénov'</a>.</p></div>
  );
}
