"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, CheckCheck, Eye, Mail, Send } from "lucide-react";
import type { MailComposeInput, MailConnectorsView, MailListsView, MailPreview, MailSendResult } from "@/lib/email/mail-contract";
import { AdminApiError, adminError, allows, readAdminJson, type AdminAccessProps } from "./admin-ui-types";
import styles from "./AdminOperations.module.css";

type ComposeDraft = { connectorId: string; listIds: string[]; recipients: string; consentConfirmed: boolean; subject: string; message: string };
const freshDraft = (): ComposeDraft => ({ connectorId: "", listIds: [], recipients: "", consentConfirmed: false, subject: "", message: "" });
export const mailResultLabels = { sent: "Accepté par le fournisseur", partial: "Acceptation partielle", failed: "En échec", pending: "Résultat en attente", skipped: "Non envoyé", verified: "Connexion vérifiée sans envoi" };

export function MailComposer({ identity, readOnly = false, refreshKey = 0, onSent }: AdminAccessProps & { refreshKey?: number; onSent?: () => void }) {
  const canSend = !readOnly && allows(identity, "mail:send");
  const [connectors, setConnectors] = useState<MailConnectorsView | null>(null);
  const [lists, setLists] = useState<MailListsView | null>(null);
  const [draft, setDraft] = useState<ComposeDraft>(freshDraft);
  const [preview, setPreview] = useState<MailPreview | null>(null);
  const [result, setResult] = useState<MailSendResult | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [attempted, setAttempted] = useState(false);
  const requestId = useRef<string | null>(null);
  const payload = useRef<MailComposeInput | null>(null);
  const previewHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (!canSend) return;
    let current = true;
    Promise.all([readAdminJson<MailConnectorsView>("/api/admin/mail/connectors"), readAdminJson<MailListsView>("/api/admin/mail/lists")]).then(([mail, groups]) => {
      if (!current) return;
      setConnectors(mail); setLists(groups); setDraft(old => ({ ...old, connectorId: old.connectorId || mail.effectiveDefaultConnectorId || mail.defaultConnectorId || "" }));
    }).catch(cause => { if (current) setError(adminError(cause)); });
    return () => { current = false; };
  }, [canSend, refreshKey]);
  function change(patch: Partial<ComposeDraft>) {
    setDraft(old => ({ ...old, ...patch })); setPreview(null); setResult(null); setError(""); requestId.current = null; payload.current = null;
  }
  async function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!canSend || busy || attempted) return;
    setError(""); setBusy("preview");
    const recipients = draft.recipients.split(/[\n,;]+/).map(value => value.trim()).filter(Boolean);
    const id = requestId.current ?? crypto.randomUUID(); requestId.current = id;
    const current: MailComposeInput = { action: "preview", requestId: id, ...(draft.connectorId ? { connectorId: draft.connectorId } : {}), listIds: draft.listIds, recipients, consentConfirmed: draft.consentConfirmed, subject: draft.subject.trim(), message: draft.message.trim() };
    try {
      const response = await readAdminJson<{ ok: boolean; preview: MailPreview }>("/api/admin/mail/send", { method: "POST", body: JSON.stringify(current) });
      if (!response.preview) throw new Error("L’aperçu n’est pas disponible. Aucun envoi n’a été demandé.");
      payload.current = { ...current, previewToken: response.preview.previewToken }; setPreview(response.preview);
      requestAnimationFrame(() => { previewHeading.current?.focus(); previewHeading.current?.scrollIntoView({ block: "start", behavior: "auto" }); });
    } catch (cause) { setError(adminError(cause)); }
    finally { setBusy(""); }
  }
  async function send() {
    if (!preview || !payload.current || !canSend || busy || result) return;
    const alreadyAttempted = attempted;
    setBusy("send"); setError(""); setAttempted(true);
    try {
      const response = await readAdminJson<{ ok: boolean; result: MailSendResult }>("/api/admin/mail/send", { method: "POST", body: JSON.stringify({ ...payload.current, action: "send" }) });
      if (!response.result) throw new Error("Le résultat de cette tentative n’a pas pu être confirmé. Consultez le journal avant de créer un nouvel envoi.");
      setResult(response.result);
      onSent?.();
    } catch (cause) {
      if (!alreadyAttempted && cause instanceof AdminApiError && [400, 401, 403, 409].includes(cause.status)) { setAttempted(false); setPreview(null); requestId.current = null; payload.current = null; }
      setError(adminError(cause));
    }
    finally { setBusy(""); }
  }
  function reset() {
    if (attempted && !window.confirm("Préparer un autre message ? Contrôlez le journal du précédent envoi pour éviter un doublon.")) return;
    setDraft({ ...freshDraft(), connectorId: connectors?.effectiveDefaultConnectorId ?? connectors?.defaultConnectorId ?? "" }); setPreview(null); setResult(null); setAttempted(false); setError(""); payload.current = null; requestId.current = null;
  }
  if (!canSend) return <p className={styles.notice}>Votre compte peut consulter le journal de messagerie. L’envoi de messages n’est pas autorisé pour ce rôle.</p>;
  const available = connectors?.connectors.filter(item => item.enabled && item.configured) ?? [];
  const selectedConnector = available.find(item => item.id === draft.connectorId);
  return <section className={styles.section} aria-labelledby="mail-composer-title">
    <div className={styles.toolbar}><div><p className={styles.eyebrow}>Un échange préparé</p><h2 id="mail-composer-title" className={styles.title}>Écrire à la bonne personne.</h2><p className={styles.text}>Composez votre message, vérifiez l’expéditeur et chaque destinataire, puis confirmez l’envoi.</p></div></div>
    {error && <p className={styles.error} role="alert">{error}</p>}
    {!connectors && !error && <p className={styles.text} role="status">Chargement des connexions et des listes…</p>}
    {connectors && !available.length && <p className={styles.notice}>Aucune connexion active et configurée. L’administrateur doit enregistrer une connexion avant le premier envoi.</p>}
    {!preview ? <form onSubmit={prepare} className={`${styles.panel} mt-6`}>
      <fieldset disabled={!!busy || !available.length}>
        <div className={styles.grid}><label className={`${styles.field} ${styles.full}`}>Connexion expéditrice<select required value={draft.connectorId} onChange={event => change({ connectorId: event.target.value })}><option value="">Choisir une connexion</option>{draft.connectorId && !selectedConnector && <option value={draft.connectorId} disabled>Connexion indisponible · choisissez une connexion</option>}{available.map(item => <option key={item.id} value={item.id}>{item.name} · {item.fromEmail}{connectors?.defaultConnectorId === item.id ? " · par défaut" : ""}</option>)}</select><small>{selectedConnector ? `Expéditeur : ${selectedConnector.fromName || selectedConnector.name} <${selectedConnector.fromEmail}>` : "Les messages utilisent une connexion enregistrée de l’entreprise."}</small></label></div>
        <div className={styles.separator}><h3 className={styles.panelTitle}>À qui écrire ?</h3>{lists?.lists.length ? <div className="mt-3">{lists.lists.map(list => <label key={list.id} className={styles.check}><input type="checkbox" checked={draft.listIds.includes(list.id)} onChange={event => change({ listIds: event.target.checked ? [...draft.listIds, list.id] : draft.listIds.filter(id => id !== list.id) })} /><span><strong>{list.name}</strong> · {list.members.length} membre(s)<br /><span className={styles.muted}>{list.type === "team" ? "Équipe interne" : `${list.members.filter(member => member.consent).length} client(s) avec autorisation`}</span></span></label>)}</div> : <p className={`${styles.muted} mt-3`}>Aucune liste enregistrée. Vous pouvez saisir une adresse directement.</p>}
          <label className={`${styles.field} mt-4`}>Adresses supplémentaires<textarea maxLength={10000} value={draft.recipients} onChange={event => change({ recipients: event.target.value, consentConfirmed: false })} placeholder="Une adresse par ligne (facultatif si une liste est choisie)" /><small>Virgules et points-virgules acceptés. 50 destinataires maximum après dédoublonnage et contrôle des autorisations.</small></label>
          {draft.recipients.trim() && <label className={`${styles.check} mt-3`}><input type="checkbox" required checked={draft.consentConfirmed} onChange={event => change({ consentConfirmed: event.target.checked })} /><span>Je confirme être autorisé à contacter les personnes saisies directement pour ce message.</span></label>}
        </div>
        <div className={`${styles.grid} ${styles.separator}`}><label className={`${styles.field} ${styles.full}`}>Objet<input required minLength={1} maxLength={180} value={draft.subject} onChange={event => change({ subject: event.target.value })} placeholder="Ex. Votre projet de rénovation — prochaine étape" /></label><label className={`${styles.field} ${styles.full}`}>Votre message<textarea required maxLength={12000} rows={10} value={draft.message} onChange={event => change({ message: event.target.value })} placeholder="Bonjour…" className="min-h-64" /><small>Texte simple. Un message individuel est envoyé à chaque adresse retenue ; les destinataires ne voient pas la liste des autres personnes.</small></label></div>
      </fieldset>
      <button className={`${styles.button} mt-6`} disabled={!!busy || !selectedConnector || (!draft.listIds.length && !draft.recipients.trim())}><Eye size={17} />{busy === "preview" ? "Préparation de l’aperçu…" : "Vérifier avant envoi"}</button><p className={`${styles.muted} mt-3`}>Cette étape prépare l’aperçu. Elle n’envoie aucun email.</p>
    </form> : <div className={`${styles.panel} mt-6`}>
      <div className={styles.actions}><CheckCheck size={20} /><h3 ref={previewHeading} tabIndex={-1} className={styles.panelTitle}>Dernière vérification avant envoi</h3></div>
      <dl className={styles.definition}><div><dt>Expéditeur</dt><dd>{preview.fromName} &lt;{preview.fromEmail}&gt;</dd></div><div><dt>Destinataires retenus</dt><dd>{preview.recipientCount} adresse(s) · {preview.excludedCount} exclue(s)</dd></div><div><dt>Objet</dt><dd>{preview.subject}</dd></div></dl>
      <details className="mt-4"><summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold text-navy">Vérifier les {preview.recipientCount} destinataires</summary><ul className={styles.recipientList}>{preview.recipients.map(item => <li key={item.email} className={styles.recipient}>{item.name ? `${item.name} · ` : ""}{item.email}</li>)}</ul></details>
      {preview.excludedCount > 0 && <p className={styles.notice}>Des membres ont été exclus par le contrôle des autorisations. Seules les adresses de la liste ci-dessus recevront ce message.</p>}
      <div className={styles.separator}><h4 className={styles.panelTitle}>Contenu du message</h4><p className={`${styles.previewMessage} mt-4`}>{preview.message}</p></div>
      {!result ? <div className={`${styles.actions} mt-6`}><button type="button" disabled={!!busy || !preview.recipientCount} className={styles.button} onClick={() => void send()}><Send size={17} />{busy === "send" ? "Envoi en cours…" : attempted ? "Vérifier ce même envoi" : `Confirmer l’envoi à ${preview.recipientCount} destinataire(s)`}</button>{!attempted && <button type="button" className={styles.secondary} disabled={!!busy} onClick={() => setPreview(null)}><ArrowLeft size={16} /> Revenir au message</button>}</div> : <div className={styles.separator} role="status"><p className={styles.panelTitle}>{mailResultLabels[result.status]}</p><p className={`${styles.text} mt-3`}>{result.message}</p><p className={styles.text}><strong>{result.acceptedCount}</strong> accepté(s) · <strong>{result.rejectedCount}</strong> refusé(s) · <strong>{result.failedCount}</strong> échec(s) sur {result.recipientCount} destinataire(s).</p>{result.duplicate && <p className={`${styles.muted} mt-3`}>Cette tentative était déjà enregistrée. Aucun nouvel envoi n’a été déclenché.</p>}<p className={`${styles.muted} mt-3`}>Un email accepté par le fournisseur n’est pas une preuve de réception ou de lecture. Consultez le journal pour suivre cette tentative.</p><button type="button" className={`${styles.secondary} mt-4`} onClick={reset}><Mail size={17} /> Préparer un autre message</button></div>}
      {attempted && !result && <p className={styles.notice}>Cette tentative conserve sa référence pour éviter un double envoi. Si le résultat reste incertain, consultez le journal avant de préparer un autre message.</p>}
    </div>}
  </section>;
}
