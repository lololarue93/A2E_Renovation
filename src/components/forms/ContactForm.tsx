"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowUpRight, CheckCircle2 } from "lucide-react";
import { getSessionId } from "@/components/analytics/AnalyticsTracker";
import { hasAnalyticsConsent } from "@/lib/analytics-consent";

export function ContactForm() {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form);
    setSending(true); setError("");
    try {
      const response = await fetch("/api/contact", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: data.get("name"), email: data.get("email"), phone: data.get("phone"), city: data.get("city"), type: data.get("type"), message: data.get("message"), consent: data.get("consent") === "on", website: data.get("website"), sessionId: getSessionId(), analyticsConsent: hasAnalyticsConsent() }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "L'envoi n'a pas pu etre confirme.");
      setReference(result.leadId); form.reset();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Connexion impossible. Votre saisie reste disponible."); }
    finally { setSending(false); }
  }
  if (reference) return <div className="border-y border-navy/15 py-10" role="status"><CheckCircle2 size={30} strokeWidth={1.5} className="text-[#51796c]" /><h2 className="mt-5 text-2xl font-semibold text-navy">Votre demande est enregistree.</h2><p className="mt-3 text-sm leading-7 text-ink/65">A2E peut maintenant consulter votre message et vos coordonnees. Reference : {reference}.</p><button type="button" onClick={() => setReference("")} className="button-text mt-5">Envoyer une autre demande <ArrowUpRight size={17} /></button></div>;
  return <form onSubmit={submit}><h2 className="text-2xl font-semibold text-navy">Presentez-nous vos travaux.</h2><p className="mt-3 text-sm leading-7 text-ink/60">Quelques informations pour preparer le premier echange. Aucun montant ne sera estime a partir de ce seul message.</p><fieldset disabled={sending} className="mt-7 grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm font-semibold">Nom *<input name="name" autoComplete="name" required minLength={2} maxLength={100} className="input" /></label><label className="grid gap-2 text-sm font-semibold">Email *<input name="email" type="email" autoComplete="email" required maxLength={160} className="input" /></label><label className="grid gap-2 text-sm font-semibold">Telephone *<input name="phone" type="tel" autoComplete="tel" required minLength={6} maxLength={30} className="input" /></label><label className="grid gap-2 text-sm font-semibold">Ville / code postal<input name="city" autoComplete="address-level2" maxLength={120} className="input" /></label><label className="grid gap-2 text-sm font-semibold sm:col-span-2">Vos travaux<select name="type" defaultValue="other" className="input"><option value="other">Projet a preciser / plusieurs metiers</option><option value="windows">Fenetres et menuiseries</option><option value="insulation">Isolation et ITE</option><option value="electricity">Electricite</option><option value="plumbing">Plomberie</option><option value="global">Renovation globale</option><option value="hvac">Chauffage et ventilation</option><option value="kitchen_bath">Cuisine et salle de bain</option><option value="roofing">Charpente et couverture</option></select></label><label className="grid gap-2 text-sm font-semibold sm:col-span-2">Votre message *<textarea name="message" required minLength={10} maxLength={12000} rows={5} placeholder="Les pieces concernees, vos envies, l'existant, les contraintes ou les questions..." className="input font-normal" /></label><div className="hidden" aria-hidden="true"><label>Votre site<input name="website" tabIndex={-1} autoComplete="off" /></label></div><label className="flex items-start gap-3 py-2 text-sm leading-6 text-ink/65 sm:col-span-2"><input name="consent" type="checkbox" required className="mt-1 h-4 w-4 shrink-0" /><span>J'accepte qu'A2E utilise ces informations pour me recontacter au sujet de mon projet. <Link href="/politique-confidentialite" className="underline">Protection des donnees</Link>.</span></label></fieldset><button disabled={sending} className="button-primary mt-5">{sending ? "Enregistrement..." : "Envoyer ma demande"} <ArrowUpRight size={18} /></button>{error && <p className="mt-5 border-l-2 border-red-700 bg-red-50 p-4 text-sm leading-6 text-red-800" role="alert">{error}</p>}</form>;
}
