export const notificationStatuses = ["sent", "partial", "failed", "pending", "skipped"] as const;
export const notificationStatusLabels = { sent: "Acceptes par le fournisseur", partial: "Acceptation partielle", failed: "Echecs / non confirmes", pending: "En attente de resultat", skipped: "Non envoyes" };
export const notificationEvents = ["notification.leadCreated", "notification.pdfGenerated", "notification.contactCreated"];
const reasons: Record<string, string> = { event_disabled: "Evenement desactive", no_recipients: "Liste de destinataires invalide ou vide", brevo_not_configured: "Brevo non configure", smtp_not_configured: "SMTP non configure", transport_failed: "Connexion ou acceptation non confirmee", partial_rejection: "Certains destinataires ont ete refuses", all_recipients_rejected: "Aucun destinataire accepte", notification_settings_unavailable: "Reglages indisponibles", notification_settings_invalid: "Reglages invalides" };
export function notificationLogDetails(payload: unknown) {
  const value = payload && typeof payload === "object" && !Array.isArray(payload) ? payload as Record<string, unknown> : {};
  const count = (key: string) => typeof value[key] === "number" && Number.isInteger(value[key]) && Number(value[key]) >= 0 ? Number(value[key]) : null;
  const reason = typeof value.reason === "string" ? reasons[value.reason] ?? (/^provider_http_\d{3}$/.test(value.reason) ? `Fournisseur : HTTP ${value.reason.slice(-3)}` : "Detail technique non classe") : null;
  return { recipientCount: count("recipientCount"), acceptedCount: count("acceptedCount"), rejectedCount: count("rejectedCount"), reason, leadId: typeof value.leadId === "string" && /^[-_a-zA-Z0-9]{1,100}$/.test(value.leadId) ? value.leadId : null };
}
