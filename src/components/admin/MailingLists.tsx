"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Bell, ListChecks, Plus, RefreshCw, Trash2, UserRoundPlus } from "lucide-react";
import type { MailList, MailListsView } from "@/lib/email/mail-contract";
import { adminError, allows, readAdminJson, type AdminAccessProps } from "./admin-ui-types";
import styles from "./AdminOperations.module.css";

const pageSize = 20;
type DraftList = MailList;
function newList(): DraftList { return { id: crypto.randomUUID(), name: "", type: "team", members: [] }; }
function cloneList(list: MailList): DraftList { return { ...list, members: list.members.map(member => ({ ...member })) }; }

export function MailingLists({ identity, readOnly = false, onChanged }: AdminAccessProps & { onChanged?: () => void }) {
  const canRead = allows(identity, "mail:read");
  const canWrite = !readOnly && allows(identity, "mail:send");
  const [data, setData] = useState<MailListsView | null>(null);
  const [selected, setSelected] = useState<MailList | null>(null);
  const [draft, setDraft] = useState<DraftList | null>(null);
  const [notifications, setNotifications] = useState(false);
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [uncertain, setUncertain] = useState(false);
  const load = useCallback(async () => { const fresh = await readAdminJson<MailListsView>("/api/admin/mail/lists"); setData(fresh); return fresh; }, []);
  useEffect(() => {
    if (!canRead) return;
    let current = true;
    readAdminJson<MailListsView>("/api/admin/mail/lists").then(fresh => { if (current) setData(fresh); }).catch(cause => { if (current) setError(adminError(cause)); });
    return () => { current = false; };
  }, [canRead]);
  const dirty = Boolean(draft && (!selected || JSON.stringify(draft) !== JSON.stringify(selected) || notifications !== Boolean(data?.notificationListIds.includes(draft.id))));
  function choose(item: MailList | null) {
    if (dirty && !window.confirm("Abandonner les modifications de cette liste ?")) return;
    setSelected(item); setDraft(item ? cloneList(item) : newList()); setNotifications(Boolean(item && data?.notificationListIds.includes(item.id))); setPage(0); setMessage(""); setError(""); setUncertain(false);
  }
  async function refresh() {
    if (dirty && !window.confirm("Recharger les listes et abandonner la saisie ?")) return;
    setBusy(true); setError("");
    try { const fresh = await load(); const found = fresh.lists.find(list => list.id === selected?.id) ?? null; setSelected(found); setDraft(found ? cloneList(found) : null); setNotifications(Boolean(found && fresh.notificationListIds.includes(found.id))); setUncertain(false); setMessage("Listes relues depuis la base."); }
    catch (cause) { setError(adminError(cause)); }
    finally { setBusy(false); }
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!data || !draft || busy || !canWrite || uncertain) return;
    setError(""); setMessage("");
    const invalid = draft.members.findIndex(member => !member.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(member.email.trim()));
    if (invalid >= 0) { setPage(Math.floor(invalid / pageSize)); setError(`Vérifiez l’adresse email du membre ${invalid + 1}.`); return; }
    const wanted: MailList = { ...draft, name: draft.name.trim(), members: draft.members.map(member => ({ email: member.email.trim().toLowerCase(), name: member.name.trim(), consent: member.consent })) };
    const seen = new Set<string>();
    const duplicate = wanted.members.findIndex(member => seen.has(member.email) || (seen.add(member.email), false));
    if (duplicate >= 0) { setPage(Math.floor(duplicate / pageSize)); setError(`L’adresse du membre ${duplicate + 1} est déjà présente. Retirez le doublon avant d’enregistrer.`); return; }
    const lists = [...data.lists.filter(list => list.id !== wanted.id), wanted];
    const notificationListIds = [...data.notificationListIds.filter(id => id !== wanted.id), ...(notifications && wanted.type === "team" ? [wanted.id] : [])];
    const effective = new Set([...(data.legacyRecipients ?? []), ...lists.filter(list => list.type === "team" && notificationListIds.includes(list.id)).flatMap(list => list.members.map(item => item.email))].map(email => email.trim().toLowerCase()));
    if (effective.size > (data.notificationRecipientLimit ?? 50)) { setError(`Cette sélection produirait ${effective.size} destinataires de notifications, au-delà de la limite de ${data.notificationRecipientLimit ?? 50}. Réduisez les membres ou retirez une liste des notifications avant d’enregistrer.`); return; }
    setBusy(true);
    try {
      await readAdminJson("/api/admin/mail/lists", { method: "PUT", body: JSON.stringify({ version: data.version, notificationListIds, lists }) }); setUncertain(true);
      const fresh = await load(); const stored = fresh.lists.find(list => list.id === wanted.id);
      if (!stored || JSON.stringify(stored) !== JSON.stringify(wanted) || (notifications && wanted.type === "team") !== fresh.notificationListIds.includes(wanted.id)) throw new Error("L’enregistrement a été accepté, mais la relecture de la liste n’est pas confirmée. Rechargez avant de continuer.");
      setSelected(stored); setDraft(cloneList(stored)); setUncertain(false); setMessage("Liste enregistrée et relue en base. Les prochains messages utiliseront ces membres."); onChanged?.();
    } catch (cause) { setError(adminError(cause)); }
    finally { setBusy(false); }
  }
  async function remove() {
    if (!data || !selected || !canWrite || busy || !window.confirm(`Supprimer la liste « ${selected.name} » ? Les notifications ne l’utiliseront plus.`)) return;
    setBusy(true); setError("");
    try {
      await readAdminJson("/api/admin/mail/lists", { method: "PUT", body: JSON.stringify({ version: data.version, notificationListIds: data.notificationListIds.filter(id => id !== selected.id), lists: data.lists.filter(list => list.id !== selected.id) }) }); setUncertain(true);
      const fresh = await load(); if (fresh.lists.some(list => list.id === selected.id) || fresh.notificationListIds.includes(selected.id)) throw new Error("La suppression n’est pas confirmée par la relecture. Rechargez les listes.");
      setSelected(null); setDraft(null); setUncertain(false); setMessage("Liste supprimée, résultat relu en base."); onChanged?.();
    } catch (cause) { setError(adminError(cause)); }
    finally { setBusy(false); }
  }
  function member(index: number, patch: Partial<MailList["members"][number]>) { setDraft(old => old ? { ...old, members: old.members.map((item, current) => current === index ? { ...item, ...patch } : item) } : old); }
  if (!canRead) return null;
  return <section className={styles.section} aria-labelledby="mail-lists-title">
    <div className={styles.toolbar}><div><p className={styles.eyebrow}>Des destinataires organisés</p><h2 id="mail-lists-title" className={styles.title}>La bonne liste, au bon moment.</h2><p className={styles.text}>Préparez les boîtes de l’équipe pour les notifications et des listes de clients autorisés pour vos messages manuels.</p></div><div className={styles.actions}><button type="button" disabled={busy} className={styles.secondary} onClick={() => void refresh()}><RefreshCw size={17} /> Recharger</button>{canWrite && <button type="button" className={styles.button} disabled={busy || (data?.lists.length ?? 0) >= 20} onClick={() => choose(null)}><Plus size={17} /> Nouvelle liste</button>}</div></div>
    {!canWrite && <p className={styles.notice}>Lecture seule. Vous pouvez consulter les membres et les listes utilisées pour les notifications.</p>}
    {data?.effectiveNotificationRecipients && <div className={styles.notice}><h3 className={styles.panelTitle}>Notifications automatiques : destinataires effectifs</h3><p className="mt-2">{data.effectiveNotificationRecipients.length} adresse(s), en réunissant les destinataires internes principaux et les listes d’équipe sélectionnées. Les doublons sont retirés. Limite : {data.notificationRecipientLimit ?? 50}.</p><details className="mt-3"><summary className="min-h-11 cursor-pointer py-2 font-semibold">Voir les adresses réellement retenues</summary><ul className={styles.recipientList}>{data.effectiveNotificationRecipients.map(email => <li className={styles.recipient} key={email}>{email}{data.legacyRecipients?.includes(email) ? " · destinataire principal" : " · liste d’équipe"}</li>)}</ul></details>{Boolean(data.legacyRecipients?.length) && <p className={`${styles.muted} mt-3`}>{allows(identity, "settings:write") ? <><a href="#settings" className="font-semibold underline">Site & notifications</a> permet de modifier les destinataires internes principaux.</> : "L’administrateur peut modifier les destinataires internes principaux dans les réglages du site."}</p>}</div>}
    {message && <p className={styles.success} role="status">{message}</p>}{error && <p className={styles.error} role="alert">{error}</p>}
    {!data && !error && <p className={styles.text} role="status">Chargement des listes…</p>}
    <div className={styles.split}><div className={styles.list}>{data?.lists.map(list => <button type="button" key={list.id} disabled={busy} aria-pressed={selected?.id === list.id} onClick={() => choose(list)} className={`${styles.entry} ${selected?.id === list.id ? styles.entryActive : ""}`}><span className={styles.entryTitle}>{list.name}</span><span className={styles.entryDetail}>{list.members.length} membre(s){list.type === "clients" ? ` · ${list.members.filter(item => item.consent).length} avec autorisation` : ""}</span><span className={styles.badges}><span className={styles.badge}>{list.type === "team" ? "Équipe interne" : "Clients"}</span>{data.notificationListIds.includes(list.id) && <span className={`${styles.badge} ${styles.badgeGreen}`}><Bell size={13} /> Notifications</span>}</span></button>)}{data && !data.lists.length && <p className={styles.empty}>Créez une liste « Équipe A2E » pour regrouper les boîtes qui recevront les demandes.</p>}</div>
      {draft ? <form onSubmit={save} className={styles.panel}>
        <h3 className={`${styles.panelTitle} flex items-center gap-2`}><ListChecks size={19} />{selected ? "Modifier la liste" : "Nouvelle liste de diffusion"}</h3>
        <fieldset disabled={busy || !canWrite} className="mt-5">
          <div className={styles.grid}><label className={styles.field}>Nom de la liste<input required minLength={2} maxLength={100} value={draft.name} onChange={event => setDraft(old => old ? { ...old, name: event.target.value } : old)} placeholder="Ex. Équipe A2E" /></label><label className={styles.field}>Usage<select value={draft.type} onChange={event => { const type = event.target.value as MailList["type"]; setDraft(old => old ? { ...old, type } : old); if (type === "clients") setNotifications(false); }}><option value="team">Équipe interne</option><option value="clients">Clients avec autorisation</option></select></label></div>
          {draft.type === "team" ? <label className={`${styles.check} mt-4`}><input type="checkbox" checked={notifications} onChange={event => setNotifications(event.target.checked)} /><span>Recevoir les notifications des nouvelles demandes et des PDF activées dans les réglages.<br /><span className={styles.muted}>Cette liste est réservée aux boîtes internes de l’entreprise.</span></span></label> : <p className={`${styles.muted} mt-4`}>Confirmez l’autorisation de chaque client. Les membres sans autorisation sont exclus de l’aperçu et de l’envoi.</p>}
          <div className={`${styles.separator} flex flex-wrap items-center justify-between gap-3`}><h4 className={styles.panelTitle}>{draft.members.length} membre(s)</h4><button type="button" className={styles.secondary} disabled={draft.members.length >= 500} onClick={() => { const next = draft.members.length; setDraft(old => old ? { ...old, members: [...old.members, { name: "", email: "", consent: false }] } : old); setPage(Math.floor(next / pageSize)); }}><UserRoundPlus size={16} /> Ajouter un membre</button></div>
          {draft.members.slice(page * pageSize, (page + 1) * pageSize).map((item, offset) => { const index = page * pageSize + offset; return <div className={styles.member} key={index}><label className={styles.field}>Nom <span className="sr-only">du membre {index + 1}</span><input maxLength={100} value={item.name} onChange={event => member(index, { name: event.target.value })} placeholder="Facultatif" /></label><label className={styles.field}>Email <span className="sr-only">du membre {index + 1}</span><input required type="email" maxLength={160} value={item.email} onChange={event => member(index, { email: event.target.value })} /></label><div className={`${styles.full} flex flex-wrap items-center justify-between gap-3`}>{draft.type === "clients" ? <label className={styles.check}><input type="checkbox" checked={item.consent} onChange={event => member(index, { consent: event.target.checked })} /><span>Autorisation de contact confirmée pour ce client.</span></label> : <span className={styles.muted}>Destinataire interne</span>}<button type="button" className={styles.danger} aria-label={`Retirer le membre ${index + 1}`} onClick={() => { setDraft(old => old ? { ...old, members: old.members.filter((_, current) => current !== index) } : old); setPage(old => Math.min(old, Math.max(0, Math.ceil((draft.members.length - 1) / pageSize) - 1))); }}><Trash2 size={16} /> Retirer</button></div></div>; })}
          {!draft.members.length && <p className={`${styles.muted} my-5`}>Aucun membre. Ajoutez au moins une adresse pour utiliser cette liste dans un message.</p>}
          {draft.members.length > pageSize && <div className={`${styles.actions} mt-3`}><button type="button" className={styles.secondary} disabled={!page} onClick={() => setPage(old => old - 1)}>Précédents</button><span className={styles.muted}>Page {page + 1} / {Math.ceil(draft.members.length / pageSize)}</span><button type="button" className={styles.secondary} disabled={(page + 1) * pageSize >= draft.members.length} onClick={() => setPage(old => old + 1)}>Suivants</button></div>}
        </fieldset>
        {canWrite && <div className={`${styles.actions} mt-6`}><button className={styles.button} disabled={busy || uncertain}>{busy ? "Enregistrement…" : "Enregistrer la liste"}</button>{selected && <button type="button" className={styles.danger} disabled={busy || uncertain} onClick={() => void remove()}><Trash2 size={16} /> Supprimer la liste</button>}</div>}
        <p className={`${styles.muted} mt-4`}>20 listes maximum · 500 membres par liste · chaque envoi est limité à 50 destinataires dédoublonnés.</p>
      </form> : <p className={styles.empty}>Sélectionnez une liste pour consulter ses membres et ses usages.</p>}
    </div>
  </section>;
}
