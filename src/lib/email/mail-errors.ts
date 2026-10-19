export class MailServiceError extends Error {
  constructor(public readonly reason: string, public readonly status = 400) { super(reason); }
}
const messages: Record<string, string> = {
  mail_store_unavailable: "La base mail est indisponible. Aucun envoi n'a ete lance.",
  mail_store_invalid: "Les reglages mail stockes sont invalides. Ils n'ont pas ete remplaces.",
  mail_version_conflict: "Ces reglages ont change. Rechargez avant de les enregistrer.",
  mail_encryption_unavailable: "Definissez MAIL_ENCRYPTION_KEY ou AUTH_SECRET avec au moins 32 caracteres sur le serveur.",
  mail_secret_unreadable: "Le secret ne peut pas etre dechiffre. Verifiez la cle serveur ou saisissez de nouveau le secret.",
  mail_secret_context_changed: "Pour changer de fournisseur, d'hote ou de compte SMTP, saisissez un nouveau secret ou effacez explicitement l'ancien.",
  mail_connector_unavailable: "Choisissez un connecteur actif et complet avant l'envoi.",
  mail_destination_invalid: "Verifiez les adresses et la limite de 50 destinataires.",
  mail_notification_limit: "Les notifications sont limitees a 50 adresses uniques, destinataires historiques et listes equipe reunis.",
  mail_consent_required: "Confirmez l'autorisation de contact des destinataires saisis manuellement.",
  mail_list_invalid: "Liste introuvable ou incompatible. Les notifications acceptent seulement les listes equipe.",
  mail_request_conflict: "Cet identifiant d'envoi correspond deja a un autre contenu. Aucun nouvel envoi n'a ete lance.",
  mail_preview_stale: "L'apercu a change ou manque. Rechargez l'apercu et verifiez les destinataires avant d'envoyer.",
  smtp_host_refused: "L'hote SMTP doit etre un nom public. Les adresses locales, privees et reservees sont refusees.",
  smtp_dns_failed: "Le nom SMTP n'a pas pu etre resolu. Verifiez l'hote et le DNS du serveur.",
  smtp_auth_failed: "Authentification SMTP refusee. Verifiez le compte, son secret et l'autorisation SMTP du fournisseur.",
  smtp_tls_failed: "Connexion TLS refusee. Verifiez l'hote et le port 465 TLS ou 587 STARTTLS.",
  smtp_timeout: "Le serveur SMTP n'a pas repondu dans le delai. Verifiez l'acces sortant de l'hebergement.",
  smtp_rejected: "Le fournisseur SMTP a refuse le destinataire ou le message.",
  transport_failed: "Connexion ou acceptation non confirmee. Consultez la configuration du fournisseur.",
  mail_log_unavailable: "Le journal n'a pas pu etre confirme. Ne relancez pas avec un nouvel identifiant sans verifier les envois.",
};
export const mailReasonMessage = (reason: string) => messages[reason] ?? (/^provider_http_\d{3}$/.test(reason) ? `Le fournisseur a retourne HTTP ${reason.slice(-3)}. Verifiez le compte et ses autorisations.` : messages.transport_failed);
export function safeTransportReason(error: unknown) {
  if (error instanceof MailServiceError) return error.reason;
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
  if (code === "EAUTH") return "smtp_auth_failed";
  if (["ETIMEDOUT", "ETIMEOUT", "ESOCKETTIMEDOUT"].includes(code)) return "smtp_timeout";
  if (["CERT_HAS_EXPIRED", "DEPTH_ZERO_SELF_SIGNED_CERT", "ERR_TLS_CERT_ALTNAME_INVALID", "ETLS"].includes(code)) return "smtp_tls_failed";
  if (code === "EENVELOPE") return "smtp_rejected";
  return "transport_failed";
}
