"use client";

import { useState } from "react";

export function LeadExports() {
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const query = new URLSearchParams({ consent: "true", ...(type ? { type } : {}), ...(status ? { status } : {}) }).toString();
  return <section className="mt-8 a2e-card p-6"><p className="font-black uppercase tracking-[.16em] text-champagne">Exports et campagnes</p><h2 className="mt-2 text-2xl font-black text-navy">Leads consentis</h2><p className="mt-2 text-sm leading-6 text-ink/65">Filtre les contacts qui ont accepte le suivi, puis exporte-les pour une relance commerciale ou un reporting.</p><div className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_auto_auto]"><select className="input" value={type} onChange={(event) => setType(event.target.value)}><option value="">Tous les projets</option><option value="windows">Fenêtres</option><option value="insulation">Isolation / ITE</option><option value="electricity">Electricite</option><option value="plumbing">Plomberie</option><option value="global">Renovation globale</option><option value="hvac">PAC / VMC</option><option value="kitchen_bath">Cuisine / salle de bain</option></select><select className="input" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Tous les statuts</option><option value="nouveau">Nouveau</option><option value="a_rappeler">A rappeler</option><option value="devis_envoye">Devis envoye</option><option value="signe">Signe</option><option value="gagne">Gagne</option></select><a className="inline-flex min-h-11 items-center justify-center rounded-card border border-navy/15 px-4 font-black text-navy" href={`/api/admin/export/leads?${query}`}>Exporter CSV</a><a className="inline-flex min-h-11 items-center justify-center rounded-card bg-navy px-4 font-black text-white" href={`/api/admin/export/report?${query}`}>Rapport PDF</a></div></section>;
}
