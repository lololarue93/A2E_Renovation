"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, FileText, Flame, House, Layers3, Plus, ShieldCheck, Square, Droplets, Wrench, Zap } from "lucide-react";
import { estimateProject, type EstimateInput, type EstimateResult } from "@/lib/pricing/estimate-engine";
import type { ProjectType } from "@/lib/pricing/price-data";
import { track, getSessionId } from "@/components/analytics/AnalyticsTracker";
import { estimateInputSchema } from "@/lib/validators/estimate.schema";
import { ANALYTICS_CONSENT_EVENT } from "@/lib/analytics-consent";
import { CustomOptions, DomainFields, Field } from "./EstimatorFields";
import { canVisitStep, estimatorSteps, initialEstimate, projectDraftKey, quickBudgetFromSearch, restoreProjectDraft, selectedProjectTypes, toggleProjectType, updateProjectDomain, validateProjectFields, type EstimatorStep } from "./estimator-flow";
import { usePricing } from "./usePricing";
import styles from "./Estimator.module.css";

const projects = [
  { type: "windows", title: "Fenêtres", hint: "Ouvrants, portes et volets", icon: Square },
  { type: "insulation", title: "Isolation", hint: "Façade et murs intérieurs", icon: Layers3 },
  { type: "electricity", title: "Électricité", hint: "Réseau et équipements", icon: Zap },
  { type: "plumbing", title: "Plomberie", hint: "Points d’eau et sanitaires", icon: Droplets },
  { type: "hvac", title: "Chauffage & air", hint: "PAC, ventilation, eau chaude", icon: Flame },
  { type: "kitchen_bath", title: "Cuisine & bain", hint: "Rénover une pièce", icon: Wrench },
  { type: "roofing", title: "Toiture", hint: "Couverture et charpente", icon: House },
  { type: "global", title: "Projet global", hint: "Rénovation et coordination", icon: Layers3 }
] as const;
const stepLabels: Record<EstimatorStep, string> = { selection: "Travaux", details: "Précisions", budget: "Budget", contact: "Votre PDF" };
const stepTitles: Record<EstimatorStep, string> = { selection: "Que souhaitez-vous rénover ?", details: "Précisons votre projet.", budget: "Votre budget, expliqué.", contact: "Gardez votre projet en PDF." };
const stepHints: Record<EstimatorStep, string> = { selection: "Choisissez un ou plusieurs métiers. Vous pourrez revenir sur chaque choix.", details: "Un métier à la fois. Vos réglages restent disponibles à chaque retour.", budget: "Retrouvez les quantités, la pose et les options avant de demander votre dossier.", contact: "Un seul dossier pour tous vos travaux, puis un échange avec l’équipe A2E." };
const money = (value: number) => value.toLocaleString("fr-FR") + " €";
const titleFor = (type: ProjectType) => projects.find((project) => project.type === type)?.title ?? "Autres travaux";

export function Estimator() {
  const [input, setInput] = useState<EstimateInput>(initialEstimate);
  const [step, setStep] = useState<EstimatorStep>("selection");
  const [furthest, setFurthest] = useState<EstimatorStep>("selection");
  const [domain, setDomain] = useState<ProjectType>("windows");
  const [draftReady, setDraftReady] = useState(false);
  const [draftNote, setDraftNote] = useState("Vos choix restent sur cet appareil.");
  const [firstBudget, setFirstBudget] = useState<EstimateInput | null>(null);
  const [resetArmed, setResetArmed] = useState(false);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [dossier, setDossier] = useState<{ id: string; reference: string } | null>(null);
  const [contact, setContact] = useState({ name: "", phone: "", email: "", consent: false, message: "", remarks: "", callbackRequested: false, callbackAvailability: "" });
  const heading = useRef<HTMLHeadingElement>(null);
  const started = useRef<string | undefined>(undefined);
  const { catalog, pricingError, pricingNotice } = usePricing();

  useEffect(() => {
    let saved: EstimateInput | null = null;
    try { saved = restoreProjectDraft(localStorage.getItem(projectDraftKey)); } catch { setDraftNote("Le brouillon reste disponible pendant cette visite."); }
    const quick = quickBudgetFromSearch(new URLSearchParams(window.location.search));
    if (saved) { setInput(saved); setDomain(selectedProjectTypes(saved)[0]); setDraftNote("Votre brouillon a été retrouvé."); }
    if (quick && saved) setFirstBudget(quick);
    else if (quick) { setInput(quick); setDomain(quick.projectType); setStep("details"); setFurthest("details"); clearQuickSearch(); const session = getSessionId(); if (session) { track("quote_started"); started.current = session; } }
    setDraftReady(true);
  }, []);
  useEffect(() => {
    if (!draftReady || !estimateInputSchema.safeParse(input).success) return;
    try { localStorage.setItem(projectDraftKey, JSON.stringify(input)); }
    catch { setDraftNote("Le brouillon reste disponible pendant cette visite."); }
  }, [input, draftReady]);
  useEffect(() => {
    const viewStep = () => { if (draftReady && !firstBudget) track("quote_step_viewed", step); };
    viewStep(); window.addEventListener(ANALYTICS_CONSENT_EVENT, viewStep);
    return () => window.removeEventListener(ANALYTICS_CONSENT_EVENT, viewStep);
  }, [step, draftReady, firstBudget]);

  const calculation = useMemo(() => {
    const error = validateProjectFields(input);
    if (error) return { result: null, error: error.message, type: error.type };
    try { return { result: estimateProject(estimateInputSchema.parse(input), catalog), error: "", type: undefined }; }
    catch { return { result: null, error: "Un tarif manque pour cette configuration. Choisissez une autre variante ou demandez une étude à A2E.", type: undefined }; }
  }, [input, catalog]);
  const result = calculation.result;
  const activeTypes = selectedProjectTypes(input);
  const activeDomain = activeTypes.includes(domain) ? domain : activeTypes[0];
  const stepIndex = estimatorSteps.indexOf(step);

  function recordStart() {
    const session = getSessionId();
    if (session && started.current !== session) { track("quote_started"); started.current = session; }
  }
  function update(partial: Partial<EstimateInput>) { recordStart(); setSubmitted(false); setDossier(null); setInput((old) => ({ ...old, ...partial })); }
  function go(next: EstimatorStep) {
    if (busy || firstBudget) return;
    if (estimatorSteps.indexOf(next) >= 2 && !result) return;
    recordStart(); setResetArmed(false); setStep(next);
    setFurthest((old) => estimatorSteps.indexOf(next) > estimatorSteps.indexOf(old) ? next : old);
    requestAnimationFrame(() => { heading.current?.focus({ preventScroll: true }); heading.current?.scrollIntoView({ behavior: "auto", block: "start" }); });
  }
  function chooseQuick(apply: boolean) {
    if (apply && firstBudget) { setInput(firstBudget); setDomain(firstBudget.projectType); setStep("details"); setFurthest("details"); setDraftNote("Votre premier choix a été appliqué."); recordStart(); }
    setFirstBudget(null); clearQuickSearch();
  }
  function reset() {
    setInput(initialEstimate()); setStep("selection"); setFurthest("selection"); setDomain("windows"); setFirstBudget(null); setStatus(""); setSubmitted(false); setDossier(null); setContact({ name: "", phone: "", email: "", consent: false, message: "", remarks: "", callbackRequested: false, callbackAvailability: "" }); setResetArmed(false); started.current = undefined; setDraftNote("Un nouveau projet est prêt."); clearQuickSearch();
  }
  async function downloadPdf(saved: { id: string; reference: string }) {
    setStatus("Votre dossier est enregistré. Téléchargement du pré-devis…");
    const pdfResponse = await fetch("/api/estimate/pdf?estimateId=" + encodeURIComponent(saved.id));
    if (!pdfResponse.ok) throw new Error("Dossier enregistré. Le PDF est temporairement indisponible ; réessayez son téléchargement ou contactez A2E avec la référence " + saved.reference);
    const url = URL.createObjectURL(await pdfResponse.blob());
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "pre-devis-" + saved.reference + ".pdf"; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    track("pdf_downloaded"); setStatus("Votre PDF est prêt. L’équipe dispose de votre projet pour préparer la suite.");
  }
  async function retryPdf() {
    if (!dossier || busy) return;
    setBusy(true);
    try { await downloadPdf(dossier); }
    catch (error) { setStatus(error instanceof Error ? error.message : "Téléchargement interrompu. Votre dossier est conservé ; réessayez."); }
    finally { setBusy(false); }
  }
  async function submitLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || submitted || pricingError || !result) return;
    setBusy(true); setStatus("Préparation de votre dossier…");
    const data = new FormData(event.currentTarget);
    const sessionId = getSessionId();
    try {
      const response = await fetch("/api/leads", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: data.get("name"), phone: data.get("phone"), email: data.get("email"), consent: data.get("consent") === "on", message: contact.message, remarks: contact.remarks, callbackRequested: contact.callbackRequested, callbackAvailability: contact.callbackRequested ? contact.callbackAvailability : "", input, result, sessionId, analyticsConsent: Boolean(sessionId) }) });
      const saved = await response.json();
      if (!response.ok || !saved.estimateId) throw new Error(saved.error ?? "Vérifiez vos coordonnées et votre configuration.");
      const created = { id: String(saved.estimateId), reference: String(saved.estimateNumber) };
      setSubmitted(true); setDossier(created); await downloadPdf(created);
    } catch (error) { setStatus(error instanceof Error ? error.message : "Connexion interrompue. Vos choix sont conservés, réessayez."); }
    finally { setBusy(false); }
  }

  return <div className={styles.flow}>
    <div className={styles.draftBar}><span><ShieldCheck size={15} aria-hidden="true" />{draftNote}</span>{resetArmed ? <span><button type="button" onClick={reset}>Confirmer le nouveau projet</button><button type="button" onClick={() => setResetArmed(false)}>Annuler</button></span> : <button type="button" onClick={() => setResetArmed(true)} disabled={busy}>Recommencer</button>}</div>
    {firstBudget && <section className={styles.restorePrompt} aria-label="Choisir le projet à reprendre"><div><p className={styles.eyebrow}>Un projet est déjà conservé</p><h2>Reprendre votre brouillon ?</h2><p>Votre premier choix « {titleFor(firstBudget.projectType)} » peut le remplacer. Votre brouillon actuel reste intact tant que vous ne l’appliquez pas.</p></div><div className={styles.promptActions}><button type="button" className={styles.primary} onClick={() => chooseQuick(true)}>Appliquer ce premier budget <ArrowRight size={17} /></button><button type="button" className={styles.secondary} onClick={() => chooseQuick(false)}>Garder mon brouillon</button></div></section>}
    <nav className={styles.steps} aria-label="Étapes de votre estimation"><ol>{estimatorSteps.map((value, index) => <li key={value}><button type="button" aria-current={step === value ? "step" : undefined} disabled={busy || Boolean(firstBudget) || !canVisitStep(value, furthest, Boolean(result))} onClick={() => go(value)} className={step === value ? styles.currentStep : index < stepIndex ? styles.completeStep : ""}><span>{index < stepIndex ? <Check size={15} aria-hidden="true" /> : index + 1}</span><strong>{stepLabels[value]}</strong></button></li>)}</ol></nav>
    <div className={styles.workspace}>
      <section className={styles.stage} aria-labelledby="estimate-step-heading">
        <fieldset className={styles.stageContent} disabled={Boolean(firstBudget) || busy}>
        <header className={styles.stageHeading}><p className={styles.eyebrow}>Étape {stepIndex + 1} / 4</p><h2 id="estimate-step-heading" ref={heading} tabIndex={-1}>{stepTitles[step]}</h2><p>{stepHints[step]}</p></header>
        {step === "selection" && <><fieldset className={styles.projectChoice}><legend className={styles.srOnly}>Travaux à inclure dans votre projet</legend>{projects.map(({ type, title, hint, icon: Icon }) => {
          const selected = activeTypes.includes(type);
          return <button key={type} type="button" aria-pressed={selected} className={`${styles.projectTile} ${selected ? styles.selectedTile : ""}`} onClick={() => { recordStart(); setSubmitted(false); setDossier(null); setInput(old => toggleProjectType(old, type)); }}><span className={styles.tileTop}><Icon size={24} strokeWidth={1.4} aria-hidden="true" /><span className={styles.tileCheck}>{selected && <Check size={13} />}</span></span><strong>{title}</strong><span>{hint}</span></button>;
        })}</fieldset><p className={styles.selectionNote}>{activeTypes.length} métier{activeTypes.length > 1 ? "s" : ""} sélectionné{activeTypes.length > 1 ? "s" : ""} · Un seul dossier, même avec plusieurs travaux.</p></>}
        {step === "details" && <>
          <div className={styles.domainNav} role="group" aria-label="Choisir le métier à préciser">{activeTypes.map(type => <button key={type} type="button" aria-pressed={activeDomain === type} onClick={() => setDomain(type)} className={activeDomain === type ? styles.activeDomain : ""}>{titleFor(type)}</button>)}<button type="button" className={styles.addDomain} onClick={() => go("selection")}><Plus size={15} /> Ajouter des travaux</button></div>
          <DomainFields key={activeDomain} type={activeDomain} catalog={catalog} input={{ ...input, surface: input.surfaces?.[activeDomain] ?? input.surface }} update={partial => { recordStart(); setSubmitted(false); setDossier(null); setInput(old => updateProjectDomain(old, activeDomain, partial)); }} />
          {activeDomain !== "windows" && Boolean(input.customItems?.length) && <CustomOptions readOnlyCatalog options={catalog} selected={input.customItems ?? []} update={customItems => update({customItems})} />}
          <details className={styles.options} open={Boolean(input.postalCode && !/^\d{5}$/.test(input.postalCode))}><summary>Lieu, accès et calendrier <span>{input.postalCode || input.city || "À préciser"}</span></summary><div className={styles.fieldGrid}><Field label="Ville"><input value={input.city ?? ""} maxLength={120} autoComplete="address-level2" onChange={event => update({ city: event.target.value })} /></Field><Field label="Code postal (facultatif)"><input value={input.postalCode ?? ""} maxLength={5} inputMode="numeric" autoComplete="postal-code" placeholder="Ex. 93200" onChange={event => update({ postalCode: event.target.value })} /></Field><Field label="Accès au chantier"><select value={input.access ?? "simple"} onChange={event => update({ access: event.target.value as EstimateInput["access"] })}><option value="simple">Simple</option><option value="medium">Moyen</option><option value="difficult">Difficile / manutention</option></select></Field><Field label="Délai souhaité"><select value={input.urgency} onChange={event => update({ urgency: event.target.value as EstimateInput["urgency"] })}><option value="info">Je me renseigne</option><option value="normal">Sous 3 mois</option><option value="fast">Rapide</option><option value="urgent">Urgent</option></select></Field></div><p className={styles.helper}>L’accès et le délai peuvent modifier les montants. Les hypothèses apparaissent dans le récapitulatif.</p></details>
        </>}
        {step === "budget" && result && <BudgetDetails result={result} edit={() => go("details")} />}
        {step === "contact" && result && <>
          <div className={styles.documentPreview}><FileText size={35} strokeWidth={1.3} aria-hidden="true" /><div><strong>Votre pré-devis A2E</strong><p>{activeTypes.map(titleFor).join(" · ")}<br />{result.lines.length} lignes · {money(result.mid)} au point central</p></div><button type="button" onClick={() => go("budget")}>Revoir le détail</button></div>
          <form onSubmit={submitLead} className={styles.contactForm}>
            <div className={styles.fieldGrid}><Field label="Nom et prénom"><input name="name" autoComplete="name" minLength={2} maxLength={100} required value={contact.name} onChange={event => setContact(old => ({ ...old, name: event.target.value }))} /></Field><Field label="Téléphone"><input name="phone" type="tel" autoComplete="tel" minLength={6} maxLength={30} required value={contact.phone} onChange={event => setContact(old => ({ ...old, phone: event.target.value }))} /></Field><Field label="Adresse email"><input name="email" type="email" autoComplete="email" maxLength={160} required value={contact.email} onChange={event => setContact(old => ({ ...old, email: event.target.value }))} /></Field></div>
            <div className="mt-6 grid gap-5 border-y border-navy/15 py-6">
              <Field label="Description de votre projet (facultatif)"><textarea name="message" rows={3} maxLength={12000} className="input font-normal" value={contact.message} onChange={event => setContact(old => ({ ...old, message: event.target.value }))} placeholder="Vos envies, une demande spécifique ou un complément aux postes chiffrés…" disabled={submitted} /></Field>
              <Field label="Remarques et contraintes (facultatif)"><textarea name="remarks" rows={3} maxLength={2000} className="input font-normal" value={contact.remarks} onChange={event => setContact(old => ({ ...old, remarks: event.target.value }))} placeholder="Accès, logement occupé, matériel à conserver, délai souhaité…" disabled={submitted} /></Field>
              <p className={styles.helper}>Ces précisions seront transmises avec votre dossier. Les travaux ajoutés en texte libre seront étudiés par A2E ; ils ne sont pas chiffrés automatiquement dans ce budget.</p>
              <label className={styles.checkbox}><input name="callbackRequested" type="checkbox" checked={contact.callbackRequested} disabled={submitted} onChange={event => setContact(old => ({ ...old, callbackRequested: event.target.checked }))} /><span>Je souhaite être rappelé pour préciser ce projet.</span></label>
              {contact.callbackRequested && <Field label="Votre préférence de rappel (facultatif)"><input name="callbackAvailability" maxLength={160} disabled={submitted} value={contact.callbackAvailability} onChange={event => setContact(old => ({ ...old, callbackAvailability: event.target.value }))} placeholder="Ex. le matin, ou après 17 h" aria-describedby="estimate-callback-help" /></Field>}
              {contact.callbackRequested && <p id="estimate-callback-help" className={styles.helper}>Votre préférence est transmise à l’équipe. Le créneau reste à convenir ensemble.</p>}
            </div>
            <label className={styles.checkbox}><input name="consent" type="checkbox" required checked={contact.consent} onChange={event => setContact(old => ({ ...old, consent: event.target.checked }))} /><span>J’accepte d’être recontacté au sujet de ce projet. <Link href="/politique-confidentialite">Confidentialité</Link></span></label>
            <button disabled={busy || submitted || Boolean(pricingError)} className={styles.primary}>{busy ? "Préparation en cours…" : submitted ? "Dossier enregistré" : "Obtenir mon dossier PDF"}{submitted ? <CheckCircle2 size={18} /> : <ArrowRight size={18} />}</button>
            {dossier && <button type="button" className={styles.secondary} disabled={busy} onClick={retryPdf}>Télécharger à nouveau le PDF <FileText size={17} /></button>}
            <p className={styles.helper}>Le devis définitif sera établi après métré et validation technique. Vos coordonnées servent à préparer la suite de ce projet.</p>
            {status && <p role="status" aria-live="polite" className={`${styles.status} ${submitted ? styles.success : ""}`}>{status}</p>}
          </form>
        </>}
        {calculation.error && <div role="alert" className={styles.error}><p>{calculation.error}</p>{calculation.type && <button type="button" onClick={() => { if (!activeTypes.includes(calculation.type!)) setInput(old => toggleProjectType(old, calculation.type!)); setDomain(calculation.type!); go("details"); }}>Vérifier {titleFor(calculation.type).toLowerCase()}</button>}<Link href="/contact">Demander une étude à A2E <ArrowRight size={15} /></Link></div>}
        {pricingError && <p role="alert" className={styles.error}>{pricingError} Le dossier PDF pourra être demandé dès que le catalogue sera disponible.</p>}
        <div className={styles.stageFooter}>{stepIndex > 0 ? <button type="button" className={styles.back} onClick={() => go(estimatorSteps[stepIndex - 1])} disabled={busy}><ArrowLeft size={17} /> Retour</button> : <span className={styles.helper}>Vous pourrez tout ajuster.</span>}{step !== "contact" && <button type="button" className={styles.primary} disabled={Boolean(firstBudget) || !draftReady || (step !== "selection" && !result)} onClick={() => go(estimatorSteps[stepIndex + 1])}>{step === "selection" ? "Préciser mon projet" : step === "details" ? "Voir mon budget" : "Recevoir mon PDF"}<ArrowRight size={18} /></button>}</div>
        </fieldset>
      </section>
      <aside className={styles.summary} aria-label="Budget en direct"><div className={styles.summaryTop}><span className={styles.liveDot} /><p>Budget en direct</p></div><p className={styles.summaryAmount} aria-live="polite" aria-atomic="true">{result ? money(result.mid) : "À compléter"}</p><p className={styles.summaryRange}>{result ? money(result.low) + " à " + money(result.high) : "Vérifiez vos valeurs pour retrouver le budget."}</p><p className={styles.summaryCaption}>Point central indicatif</p><div className={styles.summaryLots}>{activeTypes.map(type => <span key={type}><Check size={14} />{titleFor(type)}</span>)}</div><p className={styles.summaryFine}>TVA à confirmer · aides non déduites.<br />Métré, supports et raccordements à valider.</p>{step === "details" && result && <button type="button" onClick={() => go("budget")}>Lire le détail <ArrowRight size={16} /></button>}<div className={styles.catalogNotice}>{pricingNotice}</div></aside>
    </div>
    <p className={styles.pricingFootnote}>{pricingNotice} TVA à confirmer, aides non déduites.</p>
  </div>;
}

function clearQuickSearch() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has("lot") && !url.searchParams.has("quantite")) return;
  url.searchParams.delete("lot"); url.searchParams.delete("quantite");
  window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
}

function BudgetDetails({ result, edit }: { result: EstimateResult; edit: () => void }) {
  return <div className={styles.budgetDetails}>
    <div className={styles.ranges}>{(["low", "mid", "high"] as const).map((scenario, index) => <div key={scenario} className={scenario === "mid" ? styles.centralRange : ""}><span>{["Fourchette basse", "Point central", "Fourchette haute"][index]}</span><strong>{money(result[scenario])}</strong></div>)}</div>
    <p className={styles.helper}>Une enveloppe indicative pour le périmètre saisi. Les variantes et les contraintes restent à confirmer avec A2E.</p>
    <div className={styles.lineHeading}><h3>Travaux retenus <span>{result.lines.length} lignes</span></h3><button type="button" onClick={edit}>Modifier <Wrench size={15} /></button></div>
    <ol className={styles.budgetLines}>{result.lines.map((line, index) => <li key={index}><div className={styles.lineTitle}><h4>{line.label}</h4><strong>{money(line.mid)}</strong></div><p>{line.quantity.toLocaleString("fr-FR")} {displayUnit(line.unit, line.quantity)} · {money(line.low)} à {money(line.high)}</p><details><summary>Prestation et hypothèses</summary><p>{line.description}</p>{line.reference && <p>Gamme indicative : {line.reference}</p>}</details></li>)}</ol>
    <details className={styles.options}><summary>Hypothèses et étapes du chantier</summary><ul className={styles.assumptions}>{result.assumptions.map(value => <li key={value}>{value}</li>)}</ul><p className={styles.helper}>Durée indicative : {result.duration}</p><ol className={styles.roadmap}>{result.roadmap.map(value => <li key={value}>{value}</li>)}</ol></details>
    {result.roi && <p className={styles.energyNote}>Scénario énergie théorique : <strong>{money(result.roi.annualSavings)} / an</strong> sur la base de votre facture. À vérifier par un audit.</p>}
    <Link href="/aides" className={styles.inlineLink}>Explorer les possibilités d’aide <ArrowRight size={16} /></Link>
  </div>;
}

function displayUnit(unit: string, quantity: number) { return unit === "m2" ? "m²" : unit === "unit" ? quantity > 1 ? "unités" : "unité" : unit === "point" ? quantity > 1 ? "points" : "point" : unit === "forfait" ? quantity > 1 ? "forfaits" : "forfait" : unit; }
