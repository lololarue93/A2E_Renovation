export const leadStatuses = ["nouveau", "a_rappeler", "visite_a_planifier", "devis_a_preparer", "devis_envoye", "signe", "gagne", "perdu"] as const;
export type LeadStatusValue = typeof leadStatuses[number];
export const leadStatusLabels: Record<LeadStatusValue, string> = {
  nouveau: "Nouveau", a_rappeler: "A rappeler", visite_a_planifier: "Visite a planifier",
  devis_a_preparer: "Devis a preparer", devis_envoye: "Devis envoye", signe: "Signe", gagne: "Gagne", perdu: "Perdu"
};
