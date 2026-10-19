/** Official snapshots checked 2026-10-06; refresh before changing year or rules. */
export const aidSnapshot = {
  checkedAt: "2026-10-06", area: "Ile-de-France",
  sources: {
    income: "https://www.anah.gouv.fr/sites/default/files/2026-01/202601-MPR-modeEmploi_WEB.pdf",
    mpr: "https://www.service-public.gouv.fr/particuliers/vosdroits/F35083",
    ampleur: "https://france-renov.gouv.fr/aides/maprimerenov-renovation-ampleur",
    decree: "https://www.legifrance.gouv.fr/eli/decret/2026/8/25/VLOL2621819D/jo/texte",
    dpe2027: "https://www.legifrance.gouv.fr/eli/arrete/2026/8/19/VLOL2617030A/jo/texte",
    ecoPtz: "https://www.service-public.gouv.fr/particuliers/vosdroits/F19905",
    cee: "https://www.ecologie.gouv.fr/politiques-publiques/dispositif-certificats-deconomies-denergie",
    guide: "https://www.anah.gouv.fr/anatheque/le-guide-des-aides-financieres-2026"
  },
  incomeLimits2026: [[24031,29253,40851],[35270,42933,60051],[42357,51564,71846],[49455,60208,84562],[56580,68877,96817]],
  additionalPerson: [7116,8663,12257],
  profiles: ["Très modestes (bleu)","Modestes (jaune)","Intermédiaires (violet)","Supérieurs (rose)"],
  ratesAmpleur: [0.8,0.6,0.45,0.1],
  pacAirWater: [5000,4000,3000,0],
  pacGeothermal: [11000,9000,6000,0]
};
export function incomeProfile2026(people: number, income: number) {
  if (!Number.isInteger(people) || people < 1 || people > 20 || !Number.isFinite(income) || income < 0) throw new Error("Profil invalide");
  const base = aidSnapshot.incomeLimits2026[Math.min(people,5)-1];
  const limits = base.map((n,i) => n + Math.max(0,people-5) * aidSnapshot.additionalPerson[i]);
  const index = limits.findIndex(limit => income <= limit);
  return { index:index < 0 ? 3 : index, limits };
}
