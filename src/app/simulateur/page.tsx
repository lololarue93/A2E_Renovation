import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Estimator } from "@/components/calculators/Estimator";
import styles from "@/components/calculators/Estimator.module.css";

export const metadata: Metadata = { title: "Estimer mes travaux", description: "Composez vos travaux en quatre étapes : métiers, quantités, budget expliqué et pré-devis PDF. Votre projet multi-postes avec A2E en Île-de-France." };

export default function SimulatorPage() {
  return <main id="main-content" className={styles.page}>
    <header className={styles.pageHeader}><div className="container"><div className={styles.pageIntro}><div><p className={styles.eyebrow}>A2E / Votre estimation</p><h1>Un budget pour vos travaux.</h1><p>Composez votre projet. Ajustez vos choix. Préparez la suite.</p></div><Link href="/tarifs">Nos repères de prix <ArrowUpRight size={16} /></Link></div></div></header>
    <section className={styles.pageBody}><div className="container"><Estimator /><p className={styles.disclaimer}>Cette estimation prépare votre échange avec A2E. Le métré, l’état des supports, l’accès et les raccordements seront confirmés avant le devis contractuel. Les aides ne sont pas déduites automatiquement.</p></div></section>
  </main>;
}
