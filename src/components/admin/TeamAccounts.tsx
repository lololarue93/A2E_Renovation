"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { KeyRound, LockKeyhole, Plus, RefreshCw, ShieldCheck, UserRound } from "lucide-react";
import { permissionsFor, roleLabels, type AdminRole } from "@/lib/auth/permissions";
import { adminError, allows, parisDate, readAdminJson, type AdminAccessProps } from "./admin-ui-types";
import styles from "./AdminOperations.module.css";

type Account = { id: string; name: string; email: string; role: AdminRole; active: boolean; version: number; protected?: boolean; createdAt: string; updatedAt: string };
type AccountsResponse = { users: Account[]; roles: { value: AdminRole; label: string }[] };
type Draft = { name: string; email: string; role: AdminRole; active: boolean; password: string };
const emptyDraft = (): Draft => ({ name: "", email: "", role: "secretary", active: true, password: "" });
const permissionNames: Record<string, string> = {
  "dashboard:read": "Lire les indicateurs", "crm:read": "Lire les dossiers", "crm:write": "Gérer les dossiers",
  "quotes:read": "Lire les cotations", "quotes:write": "Préparer les cotations", "pricing:read": "Lire les prix", "pricing:write": "Modifier les prix",
  "gallery:read": "Lire les réalisations", "gallery:write": "Publier les réalisations", "reviews:read": "Lire les avis", "reviews:write": "Gérer les avis",
  "settings:read": "Lire les réglages", "settings:write": "Modifier les réglages", "connectors:manage": "Gérer les connexions email",
  "users:manage": "Gérer les comptes", "audit:read": "Lire le journal", "mail:read": "Lire la messagerie", "mail:send": "Envoyer des emails", "mail:manage": "Administrer la messagerie"
};

export function TeamAccounts({ identity, readOnly = false }: AdminAccessProps) {
  const canManage = !readOnly && allows(identity, "users:manage");
  const [data, setData] = useState<AccountsResponse | null>(null);
  const [selected, setSelected] = useState<Account | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [uncertain, setUncertain] = useState(false);
  const [reconnect, setReconnect] = useState(false);
  const load = useCallback(async () => {
    const fresh = await readAdminJson<AccountsResponse>("/api/admin/users");
    setData(fresh); return fresh;
  }, []);
  useEffect(() => {
    if (!canManage) return;
    let current = true;
    readAdminJson<AccountsResponse>("/api/admin/users").then(fresh => { if (current) setData(fresh); }).catch(cause => { if (current) setError(adminError(cause)); });
    return () => { current = false; };
  }, [canManage]);

  function choose(account: Account | null) {
    const previous = selected ? { name: selected.name, email: selected.email, role: selected.role, active: selected.active, password: "" } : emptyDraft();
    if ((selected || creating) && JSON.stringify(previous) !== JSON.stringify(draft) && !window.confirm("Abandonner les modifications de ce compte ?")) return;
    setSelected(account); setCreating(!account); setDraft(account ? { name: account.name, email: account.email, role: account.role, active: account.active, password: "" } : emptyDraft());
    setMessage(""); setError(""); setUncertain(false); setReconnect(false);
  }
  async function refresh() {
    if ((selected || creating) && !window.confirm("Recharger les comptes et remplacer la saisie par les valeurs enregistrées ?")) return;
    setBusy(true); setError("");
    try {
      const fresh = await load();
      const found = fresh.users.find(user => user.id === selected?.id);
      setSelected(found ?? null); setCreating(false); setDraft(found ? { name: found.name, email: found.email, role: found.role, active: found.active, password: "" } : emptyDraft());
      setUncertain(false); setMessage("Comptes rechargés depuis la base.");
    } catch (cause) { setError(adminError(cause)); }
    finally { setBusy(false); }
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !canManage || selected?.protected || uncertain) return;
    setBusy(true); setError(""); setMessage("");
    const desired = { name: draft.name.trim(), email: draft.email.trim().toLowerCase(), role: draft.role, active: draft.active };
    if (draft.password && new TextEncoder().encode(draft.password).length > 72) { setError("Le mot de passe dépasse 72 octets. Utilisez une valeur plus courte."); setBusy(false); return; }
    try {
      const response = await readAdminJson<{ user: Account; sessionRevoked?: boolean }>("/api/admin/users", {
        method: creating ? "POST" : "PATCH",
        body: JSON.stringify(creating ? { name: desired.name, email: desired.email, role: desired.role, password: draft.password } : { id: selected!.id, expectedVersion: selected!.version, ...desired, ...(draft.password ? { password: draft.password } : {}) })
      });
      setDraft(old => ({ ...old, password: "" }));
      setUncertain(true);
      if (!creating && response.user.id === identity?.id && response.sessionRevoked) {
        setReconnect(true); setMessage("La modification a été acceptée et votre session est révoquée. Reconnectez-vous pour relire votre compte."); return;
      }
      const fresh = await load();
      const stored = fresh.users.find(user => user.id === response.user.id);
      if (!stored || ["name", "email", "role", "active", "version"].some(key => stored[key as keyof Account] !== response.user[key as keyof Account]) || stored.name !== desired.name || stored.email !== desired.email || stored.role !== desired.role || (!creating && stored.active !== desired.active)) throw new Error("La demande a été acceptée, mais la relecture ne confirme pas le compte. Rechargez les données avant une nouvelle modification.");
      const changedPassword = Boolean(draft.password);
      setSelected(stored); setCreating(false); setDraft({ name: stored.name, email: stored.email, role: stored.role, active: stored.active, password: "" }); setUncertain(false);
      setMessage(`Compte enregistré et relu en base.${changedPassword ? " Le nouveau mot de passe a été pris en compte ; transmettez-le par votre canal privé." : ""}`);
    } catch (cause) { setError(adminError(cause)); }
    finally { setBusy(false); }
  }

  if (!canManage) return <p className={styles.notice}>La gestion des comptes est réservée à l’administrateur.</p>;
  return <section className={styles.section} aria-labelledby="team-title">
    <div className={styles.toolbar}><div><p className={styles.eyebrow}>Les bons accès</p><h2 id="team-title" className={styles.title}>Une place pour chaque personne.</h2><p className={styles.text}>Créez un accès individuel, choisissez son rôle et désactivez-le lorsqu’il n’est plus utile.</p></div><div className={styles.actions}><button type="button" disabled={busy} className={styles.secondary} onClick={() => void refresh()}><RefreshCw size={17} /> Recharger</button><button type="button" disabled={busy} className={styles.button} onClick={() => choose(null)}><Plus size={17} /> Nouveau compte</button></div></div>
    {identity && <p className={styles.text}>Connecté en tant que <strong>{identity.name || identity.email}</strong> · {roleLabels[identity.role]}{identity.source === "environment" ? " · compte principal du serveur" : ""}.</p>}
    {message && <p className={styles.success} role="status">{message}</p>}{error && <p className={styles.error} role="alert">{error}</p>}
    {reconnect && <Link href="/admin/connexion" className={`${styles.button} mt-4`}>Se reconnecter</Link>}
    {!data && !error && <p className={styles.text} role="status">Chargement des comptes…</p>}
    <div className={styles.split}>
      <div className={styles.list}>{data?.users.map(account => <button type="button" key={account.id} className={`${styles.entry} ${selected?.id === account.id ? styles.entryActive : ""}`} aria-pressed={selected?.id === account.id} disabled={busy} onClick={() => choose(account)}><span className={styles.entryTitle}>{account.name || account.email}</span><span className={styles.entryDetail}>{account.email}</span><span className={styles.badges}><span className={styles.badge}>{roleLabels[account.role]}</span><span className={`${styles.badge} ${account.active ? styles.badgeGreen : ""}`}>{account.active ? "Actif" : "Désactivé"}</span>{account.protected && <span className={styles.badge}><LockKeyhole size={13} /> Principal</span>}</span></button>)}{data && !data.users.length && <p className={styles.empty}>Aucun compte d’équipe pour le moment. Le compte principal du serveur reste disponible.</p>}</div>
      {(selected || creating) ? <form onSubmit={save} className={styles.panel}>
        <div className={styles.actions}><UserRound size={19} /><h3 className={styles.panelTitle}>{creating ? "Créer un compte" : selected?.protected ? "Compte principal" : "Modifier cet accès"}</h3></div>
        {selected?.protected && <p className={styles.notice}><LockKeyhole size={17} className="mb-2" />Compte principal configuré sur le serveur. Ses identifiants et son rôle sont gérés dans la configuration privée de l’hébergement.</p>}
        <fieldset disabled={busy || selected?.protected || reconnect} className={`${styles.grid} mt-5`}>
          <label className={styles.field}>Nom complet<input required minLength={2} maxLength={100} autoComplete="off" value={draft.name} onChange={event => setDraft(old => ({ ...old, name: event.target.value }))} /></label>
          <label className={styles.field}>Email de connexion<input required type="email" maxLength={160} autoComplete="off" value={draft.email} onChange={event => setDraft(old => ({ ...old, email: event.target.value }))} /></label>
          <label className={styles.field}>Rôle<select value={draft.role} onChange={event => setDraft(old => ({ ...old, role: event.target.value as AdminRole }))}>{(data?.roles ?? Object.entries(roleLabels).map(([value, label]) => ({ value, label }))).map(role => <option key={role.value} value={role.value}>{role.label}</option>)}</select></label>
          {!creating && <label className={`${styles.check} self-end`}><input type="checkbox" checked={draft.active} onChange={event => setDraft(old => ({ ...old, active: event.target.checked }))} /><span>Compte actif<br /><span className={styles.muted}>Décocher révoque cet accès après enregistrement.</span></span></label>}
          {!selected?.protected && <label className={`${styles.field} ${styles.full}`}><span className={styles.actions}><KeyRound size={16} /> {creating ? "Mot de passe initial" : "Réinitialiser le mot de passe"}</span><input type="password" required={creating} minLength={12} maxLength={72} autoComplete="new-password" value={draft.password} onChange={event => setDraft(old => ({ ...old, password: event.target.value }))} placeholder={creating ? "12 caractères minimum" : "Laisser vide pour conserver le mot de passe"} /><small>12 caractères minimum, 72 octets maximum. Le mot de passe n’est jamais relu par le navigateur. Une modification révoque les sessions existantes du compte.</small></label>}
        </fieldset>
        <div className={styles.separator}><h4 className={`${styles.panelTitle} flex items-center gap-2`}><ShieldCheck size={17} /> Droits associés à ce rôle</h4><div className={styles.permissionList}>{permissionsFor(draft.role).map(permission => <span key={permission} className={styles.permission}>{permissionNames[permission] ?? permission}</span>)}</div>{draft.role === "auditor" && <p className={`${styles.muted} mt-3`}>Lecture seule : ce compte ne modifie pas les données et n’envoie pas d’emails.</p>}</div>
        {selected && <p className={`${styles.muted} mt-4`}>Dernière modification : {parisDate(selected.updatedAt)} · révision {selected.version}.</p>}
        {!selected?.protected && <div className={`${styles.actions} mt-6`}><button className={styles.button} disabled={busy || uncertain || reconnect}>{busy ? "Enregistrement…" : creating ? "Créer ce compte" : "Enregistrer les modifications"}</button><button type="button" className={styles.secondary} disabled={busy} onClick={() => { setSelected(null); setCreating(false); setDraft(emptyDraft()); setMessage(""); setError(""); }}>Fermer</button></div>}
      </form> : <div className={styles.empty}><h3 className={styles.panelTitle}>Des accès individuels, un suivi clair.</h3><p className="mt-3">Sélectionnez une personne ou créez un compte pour votre associé, le secrétariat ou une consultation en lecture seule.</p></div>}
    </div>
  </section>;
}
