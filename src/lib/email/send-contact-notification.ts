import { prisma } from "@/lib/db/prisma";
import { getNotificationSettings } from "@/lib/settings/notification-settings";
import { escapeHtml, projectRequestContent, type ProjectRequestDetails } from "./notification-content";
import { deliverNotificationEmail, recordNotificationOutcome, validateRecipients } from "./send-lead-notification";
import { notificationListRecipients } from "./mail-store";
import { safeTransportReason } from "./mail-errors";

type Contact = ProjectRequestDetails & { leadId: string; name: string; email: string; phone: string; city?: string; type: string; message: string };
export function contactNotificationContent(input: Contact) {
  const e = escapeHtml;
  const details = projectRequestContent(input);
  return {
    subject: `A2E - Nouvelle demande de contact - ${input.leadId}`,
    text: ["Nouvelle demande de contact A2E", `Dossier : ${input.leadId}`, `Nom : ${input.name}`, `Email : ${input.email || "Non renseigne"}`, `Telephone : ${input.phone || "Non renseigne"}`, `Ville : ${input.city || "Non renseignee"}`, `Projet : ${input.type}`, details.text, "Retrouvez le dossier dans l'espace equipe."].join("\n"),
    html: `<div style="font-family:Arial,sans-serif;color:#142e32;max-width:640px"><h2>Nouvelle demande de contact</h2><p><strong>Dossier :</strong> ${e(input.leadId)}</p><p><strong>Client :</strong> ${e(input.name)}<br><strong>Email :</strong> ${e(input.email || "Non renseigne")}<br><strong>Telephone :</strong> ${e(input.phone || "Non renseigne")}<br><strong>Ville :</strong> ${e(input.city || "Non renseignee")}<br><strong>Projet :</strong> ${e(input.type)}</p>${details.html}<p>Consultez le dossier dans l'espace equipe et notez la prochaine action.</p></div>`
  };
}

export async function sendContactNotification(input: Contact) {
  let settings;
  try { settings = await getNotificationSettings({ strict: true }); }
  catch { return { sent: false, reason: "notification_settings_unavailable" }; }
  let recipients = validateRecipients(settings.recipients, 50), recipientError = "";
  if (settings.events.leadCreated) {
    try { recipients = validateRecipients(await notificationListRecipients(settings.recipients), 50); }
    catch (error) { recipientError = safeTransportReason(error); }
  }
  const ledgerId = `notification-contact-${input.leadId}`;
  try { await prisma.webhookEvent.create({ data: { id: ledgerId, name: "notification.contactCreated", payload: { leadId: input.leadId, recipientCount: recipients.length }, status: "pending" } }); }
  catch { return { sent: false, reason: "already_attempted_or_log_unavailable" }; }
  if (recipientError) { await recordNotificationOutcome(ledgerId, { ok: false, reason: recipientError }, { leadId: input.leadId, recipientCount: recipients.length }); return { sent: false, reason: recipientError }; }
  if (!settings.events.leadCreated || !recipients.length) {
    await prisma.webhookEvent.update({ where: { id: ledgerId }, data: { status: "skipped", payload: { leadId: input.leadId, reason: !settings.events.leadCreated ? "event_disabled" : "no_recipients" } } }).catch(() => undefined);
    return { sent: false, reason: "event_disabled_or_no_recipients" };
  }
  const outcome = await deliverNotificationEmail({ recipients, ...contactNotificationContent(input), replyTo: input.email || undefined }, settings);
  const logConfirmed = await recordNotificationOutcome(ledgerId, outcome, { leadId: input.leadId, recipientCount: recipients.length });
  return { sent: outcome.ok, partial: outcome.partial, reason: logConfirmed ? outcome.reason : "delivery_log_unconfirmed", logConfirmed };
}
