import { prisma } from "@/lib/db/prisma";
import { getNotificationSettings } from "@/lib/settings/notification-settings";
import { escapeHtml } from "./notification-content";
import { deliverNotificationEmail, validateRecipients } from "./send-lead-notification";

type Contact = { leadId: string; name: string; email: string; phone: string; city?: string; type: string; message: string };
export function contactNotificationContent(input: Contact) {
  const e = escapeHtml;
  return {
    subject: `A2E - Nouvelle demande de contact - ${input.leadId}`,
    text: ["Nouvelle demande de contact A2E", `Dossier : ${input.leadId}`, `Nom : ${input.name}`, `Email : ${input.email}`, `Telephone : ${input.phone}`, `Ville : ${input.city || "Non renseignee"}`, `Projet : ${input.type}`, "Message :", input.message, "Retrouvez le dossier dans l'espace equipe."].join("\n"),
    html: `<div style="font-family:Arial,sans-serif;color:#142e32;max-width:640px"><h2>Nouvelle demande de contact</h2><p><strong>Dossier :</strong> ${e(input.leadId)}</p><p><strong>Client :</strong> ${e(input.name)}<br><strong>Email :</strong> ${e(input.email)}<br><strong>Telephone :</strong> ${e(input.phone)}<br><strong>Ville :</strong> ${e(input.city || "Non renseignee")}<br><strong>Projet :</strong> ${e(input.type)}</p><p><strong>Message :</strong><br>${e(input.message).replace(/\n/g, "<br>")}</p><p>Consultez le dossier dans l'espace equipe et notez la prochaine action.</p></div>`
  };
}

export async function sendContactNotification(input: Contact) {
  const settings = await getNotificationSettings();
  const recipients = validateRecipients(settings.recipients);
  const ledgerId = `notification-contact-${input.leadId}`;
  try { await prisma.webhookEvent.create({ data: { id: ledgerId, name: "notification.contactCreated", payload: { leadId: input.leadId, recipientCount: recipients.length }, status: "pending" } }); }
  catch { return { sent: false, reason: "already_attempted_or_log_unavailable" }; }
  if (!settings.events.leadCreated || !recipients.length) {
    await prisma.webhookEvent.update({ where: { id: ledgerId }, data: { status: "skipped", payload: { leadId: input.leadId, reason: !settings.events.leadCreated ? "event_disabled" : "no_recipients" } } }).catch(() => undefined);
    return { sent: false, reason: "event_disabled_or_no_recipients" };
  }
  const outcome = await deliverNotificationEmail({ recipients, ...contactNotificationContent(input), replyTo: input.email });
  await prisma.webhookEvent.update({ where: { id: ledgerId }, data: { status: outcome.ok ? "sent" : "failed", payload: { leadId: input.leadId, recipientCount: recipients.length, ...(outcome.reason ? { reason: outcome.reason } : {}) } } }).catch(() => undefined);
  return { sent: outcome.ok, reason: outcome.reason };
}
