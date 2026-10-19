"use client";

import { useEffect, useState } from "react";
import { Cable, History, ListChecks, PenLine, RefreshCw } from "lucide-react";
import { MailConnectors } from "./MailConnectors";
import { MailComposer, mailResultLabels } from "./MailComposer";
import { MailingLists } from "./MailingLists";
import { NotificationLog } from "./NotificationLog";
import { adminError, allows, parisDate, readAdminJson, type AdminAccessProps } from "./admin-ui-types";
import styles from "./AdminOperations.module.css";

type MailTab = "compose" | "lists" | "connectors" | "journal";
type LogItem = { id: string; name: string; status: string; subject?: string; connectorName?: string; actor?: string; recipientCount?: number; acceptedCount?: number; rejectedCount?: number; failedCount?: number; reason?: string; createdAt: string };
type Logs = { items: LogItem[]; total: number; page: number; pageSize: number };

export function MailWorkspace({ identity, readOnly = false }: AdminAccessProps) {
  const canRead = allows(identity, "mail:read");
  const canSend = !readOnly && allows(identity, "mail:send");
  const canConfigure = !readOnly && allows(identity, "connectors:manage");
  const [tab, setTab] = useState<MailTab>(canSend ? "compose" : "journal");
  const [visited, setVisited] = useState<MailTab[]>([canSend ? "compose" : "journal"]);
  const [revision, setRevision] = useState(0);
  const tabs = [
    ...(canSend ? [{ id: "compose" as const, label: "Écrire un message", icon: PenLine }] : []),
    { id: "lists" as const, label: "Listes de diffusion", icon: ListChecks },
    ...(canConfigure ? [{ id: "connectors" as const, label: "Connexions email", icon: Cable }] : []),
    { id: "journal" as const, label: "Journal des envois", icon: History }
  ];
  const current = tabs.some(item => item.id === tab) ? tab : tabs[0]?.id;
  if (!canRead) return null;
  return <div className={styles.section}><nav className={styles.tabs} aria-label="Rubriques de messagerie">{tabs.map(({ id, label, icon: Icon }) => <button type="button" key={id} className={`${styles.tab} ${current === id ? styles.tabActive : ""}`} aria-current={current === id ? "page" : undefined} onClick={() => { setTab(id); setVisited(old => old.includes(id) ? old : [...old, id]); }}><Icon size={17} />{label}</button>)}</nav>
    {canSend && visited.includes("compose") && <div hidden={current !== "compose"}><MailComposer identity={identity} readOnly={readOnly} refreshKey={revision} onSent={() => setRevision(old => old + 1)} /></div>}
    {visited.includes("lists") && <div hidden={current !== "lists"}><MailingLists identity={identity} readOnly={readOnly} onChanged={() => setRevision(old => old + 1)} /></div>}
    {canConfigure && visited.includes("connectors") && <div hidden={current !== "connectors"}><MailConnectors identity={identity} readOnly={readOnly} onChanged={() => setRevision(old => old + 1)} /></div>}
    {visited.includes("journal") && <div hidden={current !== "journal"}><MailJournal refreshKey={revision} /><NotificationLog /></div>}
  </div>;
}

export function MailJournal({ refreshKey = 0 }: { refreshKey?: number }) {
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [data, setData] = useState<Logs | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let current = true; setLoading(true); setError("");
    readAdminJson<Logs>(`/api/admin/mail/logs?page=${page}`).then(fresh => { if (current) setData(fresh); }).catch(cause => { if (current) setError(adminError(cause)); }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [page, refresh, refreshKey]);
  return <section aria-labelledby="mail-journal-title"><div className={styles.toolbar}><div><p className={styles.eyebrow}>Un résultat inspectable</p><h2 id="mail-journal-title" className={styles.title}>Le fil de vos envois.</h2><p className={styles.text}>Les résultats viennent du transport utilisé. Une acceptation fournisseur ne confirme ni la réception ni la lecture.</p></div><button type="button" disabled={loading} className={styles.secondary} onClick={() => setRefresh(old => old + 1)}><RefreshCw size={17} /> Actualiser</button></div>
    {error && <p className={styles.error} role="alert">{error}</p>}{loading && <p className={styles.text} role="status">Chargement du journal…</p>}
    {data && !error && <><p className={styles.text}>{data.total} tentative(s) enregistrée(s) · dates Europe/Paris.</p><div className="mt-4">{data.items.map(item => <article key={item.id} className={styles.log}><div className="flex flex-wrap items-start justify-between gap-2"><h3 className="font-semibold text-navy">{item.subject || (item.name.includes("test") ? "Email de test" : "Notification A2E")}</h3><span className={`${styles.badge} ${item.status === "sent" ? styles.badgeGreen : item.status === "failed" || item.status === "partial" ? styles.badgeAmber : ""}`}>{mailResultLabels[item.status as keyof typeof mailResultLabels] ?? "Résultat non renseigné"}</span></div><p className={styles.muted}>{parisDate(item.createdAt)}{item.connectorName ? ` · ${item.connectorName}` : ""}{item.actor ? ` · ${item.actor}` : ""}</p>{item.recipientCount !== undefined && <p>{item.recipientCount} destinataire(s){item.acceptedCount !== undefined ? ` · ${item.acceptedCount} accepté(s)` : ""}{item.rejectedCount !== undefined ? ` · ${item.rejectedCount} refusé(s)` : ""}{item.failedCount !== undefined ? ` · ${item.failedCount} échec(s)` : ""}</p>}{item.reason && <p>{item.reason}</p>}<p className={`${styles.muted} font-mono`}>Référence {item.id}</p></article>)}{!data.items.length && <p className={styles.empty}>Aucune tentative sur cette page du journal.</p>}</div><div className={`${styles.actions} mt-5`}><button type="button" className={styles.secondary} disabled={loading || page <= 1} onClick={() => setPage(old => old - 1)}>Précédent</button><span className={styles.muted}>Page {page} / {Math.max(1, Math.ceil(data.total / data.pageSize))}</span><button type="button" className={styles.secondary} disabled={loading || page * data.pageSize >= data.total} onClick={() => setPage(old => old + 1)}>Suivant</button></div></>}
  </section>;
}
