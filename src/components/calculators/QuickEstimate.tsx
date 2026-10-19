"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, Droplets, House, Layers, Minus, PanelsTopLeft, Plus, ThermometerSun, Zap } from "lucide-react";
import { estimateProject } from "@/lib/pricing/estimate-engine";
import { usePricing } from "./usePricing";
import { buildExpressProjectInput, type ExpressProjectType } from "./estimator-flow";
import styles from "./QuickEstimate.module.css";

const choices = [
  { type: "windows", label: "Fenêtres", icon: PanelsTopLeft },
  { type: "insulation", label: "Isolation", icon: Layers },
  { type: "electricity", label: "Électricité", icon: Zap },
  { type: "plumbing", label: "Plomberie", icon: Droplets },
  { type: "hvac", label: "Chauffage", icon: ThermometerSun },
  { type: "global", label: "Rénovation", icon: House }
] as const;
const money = (value: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);

export function QuickEstimate() {
  const { catalog, pricingError, pricingNotice } = usePricing();
  const [projectType, setProjectType] = useState<ExpressProjectType>("windows");
  const [amount, setAmount] = useState(4);
  const counted = projectType === "windows" || projectType === "plumbing" || projectType === "electricity";
  const forfait = projectType === "hvac";
  const maximum = counted ? 1000 : 100000;
  const valid = Number.isFinite(amount) && amount > 0 && amount <= maximum && (counted ? Number.isInteger(amount) : Number(amount.toFixed(2)) === amount);
  const input = useMemo(() => valid ? buildExpressProjectInput(projectType, forfait ? 1 : amount) : null, [projectType, amount, valid, forfait]);
  const calculation = useMemo(() => {
    if (!input) return null;
    try { return estimateProject(input, catalog); } catch { return null; }
  }, [input, catalog]);
  const scope = projectType === "windows" ? "Fenêtres PVC 125 × 135 cm, double vitrage et pose rénovation."
    : projectType === "plumbing" ? "Points d’eau avec raccordement court eau et évacuation. Sans sanitaire ni réfection complète du réseau."
    : projectType === "electricity" ? "Prises standard fournies et posées, avec liaison courte sur un circuit existant adapté. Tableau et circuits dédiés à choisir séparément."
    : projectType === "hvac" ? "Une PAC air/eau avec mise en service. Puissance, raccordements et émetteurs à vérifier."
    : projectType === "insulation" ? "Façade sous enduit PSE. Échafaudage et adaptations à confirmer."
    : "Rénovation intermédiaire et coordination. Le périmètre reste à préciser.";
  const label = projectType === "windows" ? "Combien de fenêtres ?" : projectType === "plumbing" ? "Combien de points d’eau ?" : projectType === "electricity" ? "Combien de prises ?" : projectType === "insulation" ? "Surface de façade (m²)" : "Surface concernée (m²)";
  const href = `/simulateur?lot=${projectType}&quantite=${forfait ? 1 : amount}`;

  return <div className={styles.tool}>
    <div className={styles.form}>
      <p className={styles.kicker}>Un premier repère</p>
      <h3>Quels travaux imaginez-vous ?</h3>
      <fieldset className={styles.choices}>
        <legend className="sr-only">Choisir un poste de travaux</legend>
        {choices.map(({ type, label: title, icon: Icon }) => <button key={type} type="button" aria-pressed={projectType === type} onClick={() => { setProjectType(type); setAmount(type === "windows" || type === "plumbing" || type === "electricity" ? 4 : type === "hvac" ? 1 : 80); }} className={styles.choice}>
          <Icon size={22} aria-hidden="true" /><span>{title}</span>{projectType === type && <Check size={15} className={styles.check} aria-hidden="true" />}
        </button>)}
      </fieldset>
      {forfait ? <p className={styles.forfait}>PAC air/eau · fourniture et installation d’un équipement</p> : <div className={styles.quantity}>
        <label htmlFor="quick-amount">{label}</label>
        <div className={styles.number}>
          <button type="button" aria-label="Réduire la quantité" disabled={!valid || amount <= 1} onClick={() => setAmount(value => Math.max(1, value - 1))}><Minus size={18} /></button>
          <input id="quick-amount" type="number" inputMode={counted ? "numeric" : "decimal"} min={counted ? 1 : 0.01} max={maximum} step={counted ? 1 : 0.01} value={Number.isFinite(amount) ? amount : ""} onChange={event => setAmount(Number(event.target.value))} aria-invalid={!valid} aria-describedby={!valid ? "quick-error" : undefined} />
          <button type="button" aria-label="Augmenter la quantité" disabled={!valid || amount >= maximum} onClick={() => setAmount(value => Math.min(maximum, value + 1))}><Plus size={18} /></button>
        </div>
      </div>}
      {!valid && <p id="quick-error" role="alert" className={styles.error}>Indiquez {counted ? "un nombre entier" : "une surface avec deux décimales au maximum"} supérieur à zéro, jusqu’à {maximum.toLocaleString("fr-FR")}.</p>}
      <details className={styles.scope}><summary>Ce que couvre ce premier budget</summary><p>{scope}</p><p>{pricingError || pricingNotice}</p></details>
    </div>
    <div className={styles.budget}>
      <p className={styles.kicker}>Votre enveloppe indicative</p>
      <output className={styles.range} aria-live="polite" aria-atomic="true">{calculation ? <><span>{money(calculation.low)}</span><span className={styles.rangeTo}>à</span><span>{money(calculation.high)}</span></> : "À compléter"}</output>
      <p className={styles.budgetNote}>Un repère pour avancer. Dimensions, matériaux et options s’affinent à l’étape suivante.</p>
      {calculation ? <Link href={href} data-track="cta_click" data-track-label="Calculette express" className={styles.action}>Personnaliser ce budget <ArrowUpRight size={18} /></Link> : <span className={styles.disabledAction}>Complétez vos quantités pour continuer</span>}
      <p className={styles.conditions}>Sans coordonnées pour estimer.<br />Prix et TVA à confirmer · aides non déduites.</p>
    </div>
  </div>;
}
