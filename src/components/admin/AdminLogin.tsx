"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, LockKeyhole } from "lucide-react";
import styles from "./AdminLogin.module.css";

export function AdminLogin({ next }: { next: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError("");
    const form = event.currentTarget, fields = new FormData(form);
    try {
      const response = await fetch("/api/auth/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: fields.get("email"), password: fields.get("password") }) });
      const body = await response.json();
      if (!response.ok || body.ok !== true) throw new Error(body.error || "La connexion a echoue. Reessayez.");
      window.location.assign(next);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Connexion indisponible. Reessayez."); setPending(false);
    }
  }
  return <main id="main-content" className={styles.page}>
    <section className={styles.intro}><p className={styles.eyebrow}>A2E / Espace équipe</p><h1>Vos projets.<br />Un pilotage clair.</h1><p>Retrouvez les demandes, préparez vos cotations et faites vivre vos réalisations.</p><div className={styles.note}><LockKeyhole size={19} aria-hidden="true" /><span>Accès réservé à l’équipe A2E.</span></div></section>
    <section className={styles.panel} aria-labelledby="admin-login-title"><p className={styles.eyebrow}>Connexion</p><h2 id="admin-login-title">Bienvenue dans votre espace.</h2><p className={styles.helper}>Utilisez les identifiants administrateur de votre installation.</p><form onSubmit={login} aria-busy={pending}>
      <label htmlFor="admin-email">Identifiant<input id="admin-email" name="email" type="email" autoComplete="username" required maxLength={254} spellCheck={false} disabled={pending} /></label>
      <label htmlFor="admin-password">Mot de passe<input id="admin-password" name="password" type="password" autoComplete="current-password" required maxLength={1024} disabled={pending} /></label>
      {error && <p role="alert" className={styles.error}>{error}</p>}
      <button type="submit" disabled={pending}>{pending ? "Connexion en cours…" : "Ouvrir mon espace"}<ArrowRight size={19} aria-hidden="true" /></button>
    </form><p className={styles.fine}>La session se ferme après huit heures. Vous pouvez aussi vous déconnecter depuis l’espace de gestion.</p></section>
  </main>;
}
