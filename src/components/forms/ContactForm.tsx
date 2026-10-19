"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowUpRight, CheckCircle2, Phone } from "lucide-react";
import { getSessionId } from "@/components/analytics/AnalyticsTracker";
import { hasAnalyticsConsent } from "@/lib/analytics-consent";

export function ContactForm() {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");
  const [callbackRequested, setCallbackRequested] = useState(true);
  const [callbackAvailability, setCallbackAvailability] = useState("");
  const [submittedCallback, setSubmittedCallback] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setSending(true); setError("");
    try {
      const response = await fetch("/api/contact", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"), email: data.get("email"), phone: data.get("phone"),
          city: data.get("city"), type: data.get("type"), message: data.get("message"),
          remarks: data.get("remarks"), callbackRequested,
          callbackAvailability: callbackRequested ? callbackAvailability : "",
          consent: data.get("consent") === "on", website: data.get("website"),
          sessionId: getSessionId(), analyticsConsent: hasAnalyticsConsent()
        })
      });
      const result = await response.json();
      if (!response.ok || typeof result.leadId !== "string") throw new Error(result.error ?? "L’envoi n’a pas pu être confirmé.");
      setSubmittedCallback(callbackRequested); setReference(result.leadId); form.reset();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Connexion impossible. Votre saisie reste disponible.");
    } finally { setSending(false); }
  }

  if (reference) return <div id="demande-projet" className="scroll-mt-28 border-y border-navy/15 py-10" role="status">
    <CheckCircle2 size={30} strokeWidth={1.5} className="text-[#51796c]" />
    <h2 className="mt-5 text-2xl font-semibold text-navy">{submittedCallback ? "Votre demande de rappel est enregistrée." : "Votre projet est enregistré."}</h2>
    <p className="mt-3 text-sm leading-7 text-ink/65">L’équipe dispose de votre description, de vos remarques et de vos coordonnées.{submittedCallback && " Votre préférence de rappel lui a été transmise ; le créneau reste à convenir ensemble."}</p>
    <p className="mt-3 break-all text-xs text-ink/60">Référence : {reference}</p>
    <button type="button" onClick={() => { setReference(""); setCallbackRequested(true); setCallbackAvailability(""); }} className="button-text mt-5">Présenter un autre projet <ArrowUpRight size={17} /></button>
  </div>;

  return <form id="demande-projet" onSubmit={submit} className="min-w-0 scroll-mt-28">
    <p className="eyebrow">À votre mesure</p>
    <h2 className="mt-3 text-2xl font-semibold text-navy sm:text-3xl">Votre projet commence ici.</h2>
    <p className="mt-3 text-sm leading-7 text-ink/65">Des travaux particuliers, une idée à préciser ou une rénovation complète : décrivez votre besoin et préparons le premier échange.</p>
    <fieldset disabled={sending} className="mt-8 grid min-w-0 gap-5 border-t border-navy/15 pt-6">
      <legend className="px-0 pr-4 text-sm font-semibold text-navy">01 / Votre projet</legend>
      <label className="grid gap-2 text-sm font-semibold">Travaux souhaités
        <select name="type" defaultValue="other" className="input">
          <option value="other">Projet sur mesure / demande spécifique</option>
          <option value="global">Rénovation globale / plusieurs métiers</option>
          <option value="windows">Fenêtres et menuiseries</option>
          <option value="insulation">Isolation et ITE</option>
          <option value="electricity">Électricité</option>
          <option value="plumbing">Plomberie</option>
          <option value="hvac">Chauffage et ventilation</option>
          <option value="kitchen_bath">Cuisine et salle de bain</option>
          <option value="roofing">Charpente et couverture</option>
        </select>
      </label>
      <label className="grid gap-2 text-sm font-semibold">Description du projet *
        <textarea name="message" required minLength={10} maxLength={12000} rows={5} placeholder="Les pièces concernées, les travaux envisagés, vos envies, les dimensions si vous les connaissez…" className="input min-h-36 font-normal" />
      </label>
      <label className="grid gap-2 text-sm font-semibold">Remarques et contraintes <span className="sr-only">(facultatif)</span>
        <textarea name="remarks" maxLength={2000} rows={3} placeholder="Accès, logement occupé, délai souhaité, matériel à conserver, questions particulières… (facultatif)" className="input font-normal" />
      </label>
      <label className="grid gap-2 text-sm font-semibold">Ville / code postal
        <input name="city" autoComplete="address-level2" maxLength={120} placeholder="Où se situe le projet ?" className="input" />
      </label>
    </fieldset>
    <fieldset disabled={sending} className="mt-8 grid min-w-0 gap-5 border-t border-navy/15 pt-6 sm:grid-cols-2">
      <legend className="px-0 pr-4 text-sm font-semibold text-navy">02 / Pour vous répondre</legend>
      <div className="border-l-2 border-champagne/60 pl-4 sm:col-span-2">
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-semibold text-navy">
          <input name="callbackRequested" type="checkbox" checked={callbackRequested} onChange={event => setCallbackRequested(event.target.checked)} className="h-5 w-5 shrink-0 accent-navy" />
          <Phone size={17} className="shrink-0" aria-hidden="true" /> Je souhaite être rappelé
        </label>
        {callbackRequested && <label className="mt-3 grid gap-2 text-sm font-semibold">Quand êtes-vous disponible ?
          <input name="callbackAvailability" maxLength={160} value={callbackAvailability} onChange={event => setCallbackAvailability(event.target.value)} placeholder="Ex. en semaine après 17 h (facultatif)" aria-describedby="callback-help" className="input font-normal" />
        </label>}
        <p id="callback-help" className="mt-2 text-xs leading-6 text-ink/60">{callbackRequested ? "Indiquez une préférence. L’équipe organisera le rappel avec vous ; aucun rendez-vous n’est encore confirmé." : "Renseignez un email ou un téléphone pour que l’équipe puisse vous répondre."}</p>
      </div>
      <label className="grid gap-2 text-sm font-semibold sm:col-span-2">Nom *
        <input name="name" autoComplete="name" required minLength={2} maxLength={100} className="input" />
      </label>
      <label className="grid gap-2 text-sm font-semibold">Téléphone{callbackRequested ? " *" : ""}
        <input name="phone" type="tel" autoComplete="tel" required={callbackRequested} minLength={6} maxLength={30} className="input" />
      </label>
      <label className="grid gap-2 text-sm font-semibold">Email <span className="sr-only">(facultatif avec un téléphone)</span>
        <input name="email" type="email" autoComplete="email" maxLength={160} className="input" />
      </label>
      <div className="hidden" aria-hidden="true"><label>Votre site<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      <label className="flex items-start gap-3 py-2 text-sm leading-6 text-ink/65 sm:col-span-2">
        <input name="consent" type="checkbox" required className="mt-1 h-5 w-5 shrink-0 accent-navy" />
        <span>J’accepte qu’A2E utilise ces informations pour me recontacter au sujet de mon projet. <Link href="/politique-confidentialite" className="underline">Protection des données</Link>.</span>
      </label>
    </fieldset>
    <button disabled={sending} className="button-primary mt-5">{sending ? "Enregistrement…" : callbackRequested ? "Envoyer et demander un rappel" : "Envoyer mon projet"} <ArrowUpRight size={18} /></button>
    <p className="mt-4 text-xs leading-6 text-ink/60">Votre demande prépare un échange avec A2E. Le chiffrage sur mesure viendra après étude des travaux.</p>
    {error && <p className="mt-5 border-l-2 border-red-700 bg-red-50 p-4 text-sm leading-6 text-red-800" role="alert">{error}</p>}
  </form>;
}
