"use client";

import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, Mail } from "lucide-react";

type Provider = "brevo" | "smtp" | "ovh" | "gmail";
type Settings = { provider: Provider; leadEmail: string; recipients: string[]; events: { leadCreated: boolean; pdfGenerated: boolean; mediaUploaded: boolean; securityAlert: boolean }; telegramEnabled: boolean; trackingEnabled: boolean; signatureDiscountPercent: number; signatureWindowDays: number; phone: string; instagram: string; facebook: string; linkedin: string };
type Config = { brevoConfigured: boolean; smtpConfigured: boolean; telegramConfigured: boolean; transports?: Record<Provider, { configured: boolean; missing: string[] }> };

export function NotificationPreferences() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [recipientsText, setRecipientsText] = useState("");
  const [status, setStatus] = useState("Chargement des reglages...");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<Config>({ brevoConfigured: false, smtpConfigured: false, telegramConfigured: false });
  async function read() {
    const response = await fetch("/api/admin/settings", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Configuration indisponible.");
    const value = { ...data.settings, ...data.contact } as Settings;
    return { value, config: data as Config, saved: data.saved };
  }
  useEffect(() => {
    let active = true;
    read().then((data) => { if (!active) return; setSettings(data.value); setRecipientsText(data.value.recipients.join("\n")); setConfig(data.config); setStatus(data.saved?.notifications ? "Reglages charges depuis la base." : "Reglages initiaux : enregistrez pour activer votre configuration."); }).catch((cause) => { if (active) { setStatus(""); setError(cause instanceof Error ? cause.message : "Connexion impossible."); } });
    return () => { active = false; };
  }, []);
  const update = (patch: Partial<Settings>) => setSettings((old) => old ? { ...old, ...patch } : old);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!settings) return;
    setSaving(true); setStatus(""); setError("");
    const recipients = recipientsText.split(/[;,\n]/).map((item) => item.trim()).filter(Boolean);
    try {
      const response = await fetch("/api/admin/settings", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...settings, recipients }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Enregistrement impossible.");
      const expected = { ...data.settings, ...data.contact } as Settings;
      const fresh = await read();
      const same = (Object.keys(expected) as (keyof Settings)[]).every((key) => JSON.stringify(fresh.value[key]) === JSON.stringify(expected[key]));
      if (!same || !fresh.saved?.notifications || !fresh.saved?.contact) throw new Error("Sauvegarde envoyee, mais la relecture ne confirme pas les valeurs. Rechargez avant de reessayer.");
      setSettings(fresh.value); setRecipientsText(fresh.value.recipients.join("\n")); setConfig(fresh.config); setStatus("Reglages enregistres et relus en base. Les prochaines demandes utiliseront ces destinataires.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Connexion impossible."); }
    finally { setSaving(false); }
  }
  if (!settings) return <div className="mt-5"><p role="status" className="text-sm text-ink/60">{status}</p>{error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}</div>;
  const transport = config.transports?.[settings.provider];
  const transportReady = transport?.configured ?? (settings.provider === "brevo" ? config.brevoConfigured : config.smtpConfigured);
  return <form onSubmit={save} className="mt-6 rounded-xl border border-navy/10 bg-white p-5 sm:p-6">
    <div className="mb-6 flex items-start gap-3 border-b border-navy/10 pb-5"><Mail size={20} className="mt-0.5 shrink-0 text-champagne" /><div><h3 className="font-bold text-navy">Un message au bon interlocuteur.</h3><p className="mt-2 text-sm leading-6 text-ink/60">Chaque demande peut avertir une ou plusieurs boites. Les secrets techniques sont renseignes dans Docker.</p></div></div>
    <div className="grid gap-4 md:grid-cols-2">
      <label className="grid gap-2 text-sm font-bold text-ink/80">Canal d'envoi<select className="input min-h-12" value={settings.provider} onChange={(event) => update({ provider: event.target.value as Provider })}><option value="brevo">Brevo API</option><option value="ovh">OVH SMTP</option><option value="gmail">Gmail SMTP</option><option value="smtp">Autre serveur SMTP</option></select></label>
      <label className="grid gap-2 text-sm font-bold text-ink/80 md:row-span-2">Destinataires des alertes *<textarea required className="input min-h-28 font-normal" value={recipientsText} onChange={(event) => setRecipientsText(event.target.value)} placeholder="contact@entreprise.fr" /><span className="text-xs font-normal text-ink/55">1 a 20 adresses, une par ligne. Virgules et points-virgules acceptes.</span></label>
      <div className={`rounded-xl p-4 text-sm leading-6 ${transportReady ? "bg-[#51796c]/10 text-[#385f51]" : "bg-amber-50 text-amber-900"}`}><strong>{transportReady ? "Configuration presente - reception a tester" : "Canal choisi a configurer"}</strong><p className="mt-1">{transportReady ? "Les variables techniques sont presentes. La connexion et la livraison effective ne sont pas testees par ce statut." : `Variables a verifier dans Portainer : ${transport?.missing.join(", ") || "configuration du canal choisi"}.`}</p></div>
      <label className="grid gap-2 text-sm font-bold text-ink/80">Adresse historique (facultatif)<input className="input min-h-12" type="email" maxLength={160} value={settings.leadEmail} onChange={(event) => update({ leadEmail: event.target.value })} /><span className="text-xs font-normal text-ink">Les alertes utilisent la liste de destinataires ci-dessus.</span></label>
      <label className="grid gap-2 text-sm font-bold text-ink/80">Telephone public *<input className="input min-h-12" required type="tel" minLength={6} maxLength={40} value={settings.phone} onChange={(event) => update({ phone: event.target.value })} /></label>
      <label className="grid gap-2 text-sm font-bold text-ink/80">Instagram<input className="input min-h-12" type="url" maxLength={300} placeholder="https://instagram.com/..." value={settings.instagram} onChange={(event) => update({ instagram: event.target.value })} /></label>
      <label className="grid gap-2 text-sm font-bold text-ink/80">Facebook<input className="input min-h-12" type="url" maxLength={300} placeholder="https://facebook.com/..." value={settings.facebook} onChange={(event) => update({ facebook: event.target.value })} /></label>
      <label className="grid gap-2 text-sm font-bold text-ink/80">LinkedIn<input className="input min-h-12" type="url" maxLength={300} placeholder="https://linkedin.com/company/..." value={settings.linkedin} onChange={(event) => update({ linkedin: event.target.value })} /></label>
    </div>
    <div className="mt-6 border-t border-navy/10 pt-5"><h3 className="font-bold text-navy">Automatisation et mesure</h3><div className="mt-3 grid gap-3 sm:grid-cols-2"><Check label="Email automatique : nouvelle demande" checked={settings.events.leadCreated} onChange={(value) => update({ events: { ...settings.events, leadCreated: value } })} /><Check label="Email automatique : pre-devis PDF" checked={settings.events.pdfGenerated} onChange={(value) => update({ events: { ...settings.events, pdfGenerated: value } })} /><Check label="Alertes Telegram" checked={settings.telegramEnabled} onChange={(value) => update({ telegramEnabled: value })} /><Check label="Suivi des visites et clics" checked={settings.trackingEnabled} onChange={(value) => update({ trackingEnabled: value })} /></div><p className="mt-3 text-xs leading-6 text-ink/55">Telegram : {config.telegramConfigured ? "variables presentes" : "variables manquantes dans Docker"}. Les preferences media et securite existantes sont conservees ; leur automatisation doit etre raccordee avant activation.</p></div>
    <div className="mt-6 grid gap-4 border-t border-navy/10 pt-5 md:grid-cols-2"><label className="grid gap-2 text-sm font-bold text-ink/80">Avantage signature (%)<input className="input min-h-12" type="number" required min="0" max="15" step="0.5" value={settings.signatureDiscountPercent} onChange={(event) => update({ signatureDiscountPercent: Number(event.target.value) })} /></label><label className="grid gap-2 text-sm font-bold text-ink/80">Duree de validite (jours)<input className="input min-h-12" type="number" required min="1" max="60" step="1" value={settings.signatureWindowDays} onChange={(event) => update({ signatureWindowDays: Number(event.target.value) })} /></label></div>
    <div className="mt-6 flex flex-wrap items-center gap-3"><button disabled={saving} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-navy px-5 text-sm font-bold text-white disabled:opacity-50"><CheckCircle2 size={17} /> {saving ? "Enregistrement..." : "Enregistrer les reglages"}</button><span className="text-sm leading-6 text-ink/65" role="status">{status}</span></div>{error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
  </form>;
}
function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) { return <label className="flex min-h-12 items-center gap-3 text-sm font-bold text-navy"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /> {label}</label>; }
