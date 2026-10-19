"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { CheckCircle2, KeyRound, Mail, Plus, RefreshCw, Server, ShieldCheck } from "lucide-react";
import { smtpPresets, type MailConnectorFields, type MailConnectorInput, type MailConnectorView, type MailConnectorsView, type MailSendResult, type SmtpPreset } from "@/lib/email/mail-contract";
import { adminError, allows, readAdminJson, type AdminAccessProps } from "./admin-ui-types";
import styles from "./AdminOperations.module.css";

type ConnectorDraft = MailConnectorInput;
const connectorFields = ["id", "name", "provider", "preset", "host", "port", "security", "username", "fromEmail", "fromName", "enabled"] as const;
const kindLabels = { ovh: "OVH", gmail: "Gmail", custom: "Autre serveur SMTP", brevo: "Brevo API" };
function editable(item: MailConnectorFields): MailConnectorInput { return Object.fromEntries(connectorFields.map(key => [key, item[key]])) as MailConnectorInput; }
function blank(): ConnectorDraft { return { id: crypto.randomUUID(), name: "", provider: "smtp", preset: "ovh", ...smtpPresets.ovh, username: "", fromEmail: "", fromName: "A2E Rénovation", enabled: true, secret: "", clearSecret: false }; }
function matches(stored: MailConnectorView, wanted: MailConnectorInput) { return connectorFields.every(key => stored[key] === wanted[key]); }

export function MailConnectors({ identity, readOnly = false, onChanged }: AdminAccessProps & { onChanged?: () => void }) {
  const canManage = !readOnly && allows(identity, "connectors:manage");
  const [data, setData] = useState<MailConnectorsView | null>(null);
  const [selected, setSelected] = useState<MailConnectorView | null>(null);
  const [draft, setDraft] = useState<ConnectorDraft | null>(null);
  const [makeDefault, setMakeDefault] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [uncertain, setUncertain] = useState(false);
  const [testTo, setTestTo] = useState("");
  const [testResult, setTestResult] = useState<MailSendResult | null>(null);
  const testId = useRef<string | null>(null);
  const load = useCallback(async () => { const fresh = await readAdminJson<MailConnectorsView>("/api/admin/mail/connectors"); setData(fresh); return fresh; }, []);
  useEffect(() => {
    if (!canManage) return;
    let current = true;
    readAdminJson<MailConnectorsView>("/api/admin/mail/connectors").then(fresh => { if (current) setData(fresh); }).catch(cause => { if (current) setError(adminError(cause)); });
    return () => { current = false; };
  }, [canManage]);

  function choose(item: MailConnectorView | null) {
    if (draft && !window.confirm("Changer de connexion ? Les modifications non enregistrées seront abandonnées.")) return;
    setSelected(item); setDraft(item ? { ...editable(item), secret: "", clearSecret: false } : blank());
    setMakeDefault(item ? data?.defaultConnectorId === item.id : !data?.defaultConnectorId); setError(""); setMessage(""); setUncertain(false); setTestResult(null); testId.current = null;
  }
  function change(patch: Partial<ConnectorDraft>) { setDraft(old => old ? { ...old, ...patch } : old); setMessage(""); setTestResult(null); }
  function preset(kind: keyof typeof kindLabels) {
    if (kind === "brevo") change({ provider: "brevo", preset: "custom", host: "", username: "", secret: "", clearSecret: false });
    else change({ provider: "smtp", preset: kind, ...smtpPresets[kind as SmtpPreset], secret: "", clearSecret: false });
  }
  async function refresh() {
    if (draft && !window.confirm("Recharger les connexions et abandonner la saisie en cours ?")) return;
    setBusy("load"); setError("");
    try { const fresh = await load(); const item = fresh.connectors.find(connector => connector.id === selected?.id) ?? null; setSelected(item); setDraft(item ? { ...editable(item), secret: "", clearSecret: false } : null); setMakeDefault(Boolean(item && item.id === fresh.defaultConnectorId)); setUncertain(false); setMessage("Connexions relues depuis la base."); }
    catch (cause) { setError(adminError(cause)); }
    finally { setBusy(""); }
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!data || !draft || busy || !canManage || selected?.source === "environment" || uncertain) return;
    setBusy("save"); setError(""); setMessage("");
    const wanted = { ...draft, name: draft.name.trim(), fromEmail: draft.fromEmail.trim().toLowerCase(), fromName: draft.fromName.trim(), host: draft.host.trim().toLowerCase(), username: draft.username.trim() };
    const next = data.connectors.filter(item => item.source === "admin" && item.id !== wanted.id).map(editable);
    next.push({ ...editable(wanted), ...(wanted.secret ? { secret: wanted.secret } : {}), ...(wanted.clearSecret ? { clearSecret: true } : {}) });
    const defaultConnectorId = makeDefault ? wanted.id : data.defaultConnectorId === wanted.id ? null : data.defaultConnectorId;
    try {
      await readAdminJson("/api/admin/mail/connectors", { method: "PUT", body: JSON.stringify({ version: data.version, defaultConnectorId, connectors: next }) });
      setDraft(old => old ? { ...old, secret: "" } : old); setUncertain(true);
      const fresh = await load(); const item = fresh.connectors.find(connector => connector.id === wanted.id);
      if (!item || !matches(item, wanted) || fresh.defaultConnectorId !== defaultConnectorId || (wanted.secret && !item.secretConfigured) || (wanted.clearSecret && item.secretConfigured)) throw new Error("L’enregistrement a été accepté mais sa relecture n’est pas confirmée. Rechargez avant de tester ou de modifier.");
      setSelected(item); setDraft({ ...editable(item), secret: "", clearSecret: false }); setMakeDefault(fresh.defaultConnectorId === item.id); setUncertain(false); testId.current = null; setTestResult(null); setMessage("Connexion enregistrée et relue. Vous pouvez maintenant vérifier la connexion puis envoyer un email de test."); onChanged?.();
    } catch (cause) { setError(adminError(cause)); }
    finally { setBusy(""); }
  }
  const dirty = Boolean(draft && (!selected || !matches(selected, draft) || draft.secret || draft.clearSecret || makeDefault !== (selected.id === data?.defaultConnectorId)));
  const canTest = Boolean(selected?.configured && selected.enabled && !dirty && !uncertain);
  async function verify() {
    if (!selected || !canTest || busy) return;
    setBusy("verify"); setError(""); setMessage("");
    try { const result = await readAdminJson<{ ok: boolean; message: string; reason?: string }>("/api/admin/mail/verify", { method: "POST", body: JSON.stringify({ connectorId: selected.id }) }); if (!result.ok) throw new Error(result.message || "La connexion n’a pas pu être vérifiée."); setMessage(`${result.message || "Connexion au fournisseur vérifiée."} Ce contrôle n’envoie aucun email et ne garantit pas la réception.`); }
    catch (cause) { setError(adminError(cause)); }
    finally { setBusy(""); }
  }
  async function sendTest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selected || !canTest || busy) return;
    setBusy("test"); setError(""); setMessage("");
    const requestId = testId.current ?? crypto.randomUUID(); testId.current = requestId;
    try { const result = await readAdminJson<{ ok: boolean; result: MailSendResult }>("/api/admin/mail/test", { method: "POST", body: JSON.stringify({ connectorId: selected.id, to: testTo.trim(), requestId }) }); setTestResult(result.result); setMessage("La tentative est enregistrée. Contrôlez la boîte destinataire et les indésirables pour confirmer la réception."); }
    catch (cause) { setError(adminError(cause)); }
    finally { setBusy(""); }
  }
  async function selectServerDefault() {
    if (!selected || !data || busy || !selected.configured || !selected.enabled) return;
    setBusy("default"); setError("");
    try {
      await readAdminJson("/api/admin/mail/connectors", { method: "PUT", body: JSON.stringify({ version: data.version, defaultConnectorId: selected.id, connectors: data.connectors.filter(item => item.source === "admin").map(editable) }) });
      const fresh = await load(); if (fresh.defaultConnectorId !== selected.id) throw new Error("La sélection par défaut n’est pas confirmée. Rechargez les connexions.");
      setMakeDefault(true); setMessage("Connexion par défaut enregistrée et relue."); onChanged?.();
    } catch (cause) { setError(adminError(cause)); }
    finally { setBusy(""); }
  }

  if (!canManage) return <p className={styles.notice}>Seul l’administrateur peut gérer les connexions de messagerie.</p>;
  const effectiveDefault = data?.effectiveDefaultConnectorId ?? data?.defaultConnectorId;
  const currentDefault = data?.connectors.find(item => item.id === effectiveDefault);
  return <section className={styles.section} aria-labelledby="mail-connectors-title">
    <div className={styles.toolbar}><div><p className={styles.eyebrow}>Vos boîtes professionnelles</p><h2 id="mail-connectors-title" className={styles.title}>Connecter. Vérifier. Envoyer.</h2><p className={styles.text}>Reliez une boîte existante ou Brevo. Choisissez la connexion utilisée par défaut pour les prochains messages.</p></div><div className={styles.actions}><button type="button" className={styles.secondary} disabled={!!busy} onClick={() => void refresh()}><RefreshCw size={17} /> Recharger</button><button type="button" className={styles.button} disabled={!!busy || (data?.connectors.filter(item => item.source === "admin").length ?? 0) >= 10} onClick={() => choose(null)}><Plus size={17} /> Ajouter une connexion</button></div></div>
    {data && <p className={styles.text}>Connexion par défaut : <strong>{currentDefault?.name ?? "Configuration du serveur"}</strong>{currentDefault ? `${currentDefault.fromEmail ? ` · ${currentDefault.fromEmail}` : ""} · ${currentDefault.enabled && currentDefault.configured ? "paramètres présents, réception à vérifier" : "configuration à compléter"}` : ". Sans sélection explicite, le fournisseur historique du serveur reste utilisé lorsqu’il est configuré."}</p>}
    {data && !data.encryptionConfigured && <p className={styles.error} role="alert">Le chiffrement des identifiants n’est pas configuré sur cet hébergement. L’opérateur doit renseigner une clé privée MAIL_ENCRYPTION_KEY ou un AUTH_SECRET valide avant l’enregistrement de nouveaux secrets.</p>}
    {message && <p className={styles.success} role="status">{message}</p>}{error && <p className={styles.error} role="alert">{error}</p>}
    {!data && !error && <p className={styles.text} role="status">Chargement des connexions…</p>}
    <div className={styles.split}><div className={styles.list}>{data?.connectors.map(item => <button type="button" key={item.id} className={`${styles.entry} ${selected?.id === item.id ? styles.entryActive : ""}`} aria-pressed={selected?.id === item.id} disabled={!!busy} onClick={() => choose(item)}><span className={styles.entryTitle}>{item.name}</span><span className={styles.entryDetail}>{item.fromEmail || "Expéditeur à renseigner"}</span><span className={styles.badges}>{effectiveDefault === item.id && <span className={`${styles.badge} ${styles.badgeGreen}`}>Par défaut{!data.defaultConnectorId ? " · serveur" : ""}</span>}<span className={styles.badge}>{item.provider === "brevo" ? "Brevo API" : kindLabels[item.preset]}</span><span className={`${styles.badge} ${item.enabled && item.configured ? styles.badgeGreen : styles.badgeAmber}`}>{!item.enabled ? "Désactivée" : item.configured ? "Paramètres présents" : "À compléter"}</span>{item.source === "environment" && <span className={styles.badge}>Configuration serveur</span>}</span></button>)}{data && !data.connectors.length && <p className={styles.empty}>Ajoutez une première connexion pour préparer les notifications et les emails de l’équipe.</p>}</div>
      {draft ? <div className={styles.panel}>
        <form onSubmit={save}>
          <div className={styles.actions}><Server size={19} /><h3 className={styles.panelTitle}>{selected ? "Paramètres de la connexion" : "Nouvelle connexion"}</h3></div>
          {selected?.source === "environment" && <p className={styles.notice}>Cette connexion vient de la configuration du serveur. Créez une connexion administrable pour remplacer ses paramètres depuis cet écran.</p>}
          <fieldset disabled={!!busy || selected?.source === "environment"} className={`${styles.grid} mt-5`}>
            <label className={styles.field}>Nom de la connexion<input required maxLength={100} value={draft.name} onChange={event => change({ name: event.target.value })} placeholder="Ex. Accueil A2E" /></label>
            <label className={styles.field}>Fournisseur<select value={draft.provider === "brevo" ? "brevo" : draft.preset} onChange={event => preset(event.target.value as keyof typeof kindLabels)}>{Object.entries(kindLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className={styles.field}>Email expéditeur<input type="email" required maxLength={160} value={draft.fromEmail} onChange={event => change({ fromEmail: event.target.value })} placeholder="contact@entreprise.fr" /></label>
            <label className={styles.field}>Nom affiché<input maxLength={100} value={draft.fromName} onChange={event => change({ fromName: event.target.value })} /></label>
            {draft.provider === "smtp" && <><label className={`${styles.field} ${styles.full}`}>Serveur SMTP<input required maxLength={253} readOnly={draft.preset !== "custom"} value={draft.host} onChange={event => change({ host: event.target.value })} placeholder="smtp.fournisseur.fr" /><small>{draft.preset === "custom" ? "Nom du serveur donné par votre fournisseur, sans https:// ni chemin." : "Paramètres du fournisseur. Choisissez Autre serveur SMTP pour une autre configuration."}</small></label><label className={styles.field}>Connexion chiffrée<select disabled={draft.preset !== "custom"} value={draft.security} onChange={event => change(event.target.value === "tls" ? { security: "tls", port: 465 } : { security: "starttls", port: 587 })}><option value="tls">TLS direct · port 465</option><option value="starttls">STARTTLS obligatoire · port 587</option></select></label><label className={styles.field}>Identifiant SMTP<input required autoComplete="off" maxLength={320} value={draft.username} onChange={event => change({ username: event.target.value })} /></label></>}
            <label className={`${styles.field} ${styles.full}`}><span className={styles.actions}><KeyRound size={16} />{draft.provider === "brevo" ? "Clé API Brevo" : "Mot de passe SMTP"}</span><input type="password" autoComplete="new-password" maxLength={8192} value={draft.secret ?? ""} onChange={event => change({ secret: event.target.value, clearSecret: false })} required={!selected?.secretConfigured && !draft.clearSecret} placeholder={selected?.secretConfigured ? "Secret enregistré · laisser vide pour le conserver" : draft.preset === "gmail" ? "Mot de passe d’application du compte" : "Saisir le secret du fournisseur"} /><small>Le secret est chiffré côté serveur. Il n’est jamais renvoyé dans la page.</small></label>
            {selected?.secretConfigured && <label className={`${styles.check} ${styles.full}`}><input type="checkbox" checked={draft.clearSecret ?? false} onChange={event => change({ clearSecret: event.target.checked, secret: "" })} /><span>Supprimer le secret enregistré lors de la sauvegarde.</span></label>}
            <label className={styles.check}><input type="checkbox" checked={draft.enabled} onChange={event => change({ enabled: event.target.checked })} /><span>Connexion active</span></label><label className={styles.check}><input type="checkbox" checked={makeDefault} onChange={event => setMakeDefault(event.target.checked)} /><span>Utiliser par défaut</span></label>
          </fieldset>
          {draft.preset === "gmail" && draft.provider === "smtp" && <p className={`${styles.muted} mt-4`}>Gmail utilise un mot de passe d’application lorsque le compte l’autorise. Vérifiez la validation en deux étapes et les règles de votre organisation.</p>}
          {draft.host.toLowerCase().includes("office365") && draft.provider === "smtp" && <p className={styles.notice}>Votre organisation doit autoriser le mode SMTP utilisé. L’authentification OAuth Microsoft n’est pas proposée ici ; choisissez un canal compatible si elle est obligatoire pour cette boîte.</p>}
          {draft.provider === "brevo" && <p className={`${styles.muted} mt-4`}>Utilisez une clé API transactionnelle et un expéditeur autorisé dans Brevo. Ce canal passe par HTTPS.</p>}
          {selected?.secretConfigured && (selected.provider !== draft.provider || selected.host !== draft.host || selected.username !== draft.username) && !draft.secret && !draft.clearSecret && <p className={styles.notice}>La connexion ou l’identifiant a changé. Saisissez le nouveau secret, ou retirez explicitement l’ancien avant d’enregistrer.</p>}
          {selected?.source !== "environment" && <button className={`${styles.button} mt-6`} disabled={!!busy || uncertain || (!data?.encryptionConfigured && Boolean(draft.secret))}>{busy === "save" ? "Enregistrement…" : "Enregistrer la connexion"}</button>}
        </form>
        {selected?.source === "environment" && selected.id !== data?.defaultConnectorId && <button type="button" className={`${styles.secondary} mt-5`} disabled={!!busy || !selected.configured || !selected.enabled} onClick={() => void selectServerDefault()}>Utiliser cette connexion par défaut</button>}
        {selected && <div className={styles.separator}><h4 className={`${styles.panelTitle} flex items-center gap-2`}><ShieldCheck size={18} /> Vérifier avant utilisation</h4><p className={`${styles.muted} mt-3`}>{dirty ? "Enregistrez vos changements avant de lancer un contrôle." : "Vérifiez d’abord l’accès au fournisseur. Un email de test permet ensuite de contrôler la réception dans une boîte autorisée."}</p><button type="button" className={`${styles.secondary} mt-4`} disabled={!!busy || !canTest} onClick={() => void verify()}><CheckCircle2 size={17} />{busy === "verify" ? "Vérification…" : "Tester la connexion sans envoyer"}</button><form onSubmit={sendTest} className="mt-5"><label className={styles.field}>Boîte autorisée pour le test<input type="email" required maxLength={160} value={testTo} onChange={event => { setTestTo(event.target.value); testId.current = null; setTestResult(null); }} placeholder="Votre adresse professionnelle" disabled={!!busy} /></label><button className={`${styles.button} mt-3`} disabled={!!busy || !canTest || !testTo.trim()}><Mail size={17} />{busy === "test" ? "Envoi du test…" : "Envoyer cet email de test"}</button><p className={`${styles.muted} mt-3`}>Cette action envoie un message réel à l’adresse indiquée.</p></form>{testResult && <div className={styles.notice} role="status"><strong>{testResult.message}</strong><p>{testResult.acceptedCount} accepté(s) · {testResult.rejectedCount} refusé(s) · {testResult.failedCount} échec(s).{testResult.duplicate ? " Cette demande de test a déjà été traitée ; aucun nouvel envoi." : ""}</p><p>Accepté par le fournisseur ne signifie pas reçu en boîte.</p></div>}</div>}
      </div> : <p className={styles.empty}>Choisissez une connexion pour consulter ses paramètres, ou ajoutez celle de votre boîte professionnelle.</p>}
    </div>
  </section>;
}
