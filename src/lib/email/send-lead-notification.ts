import { getNotificationSettings, type NotificationSettingsValue } from "@/lib/settings/notification-settings";
import { notificationContent, type LeadNotificationInput } from "./notification-content";
import { prisma } from "@/lib/db/prisma";
import nodemailer from "nodemailer";
import { emailTransportConfig } from "./transport-config";
import { validateRecipients } from "./recipient-list";
export { validateRecipients } from "./recipient-list";

export type DeliveryResult = { ok: boolean; reason?: string; acceptedCount?: number; rejectedCount?: number; partial?: boolean };
export async function deliverNotificationEmail(input: { recipients: string[]; subject: string; html: string; text: string; replyTo?: string; attachment?: { filename: string; content: Uint8Array } }, chosenSettings?: Pick<NotificationSettingsValue, "provider">): Promise<DeliveryResult> {
  const recipients = validateRecipients(input.recipients);
  if (!recipients.length) return { ok: false, reason: "no_recipients" };
  try {
    const settings = chosenSettings ?? await getNotificationSettings({ strict: true });
    const config = emailTransportConfig(settings.provider);
    if (!config.configured) return { ok: false, reason: settings.provider === "brevo" ? "brevo_not_configured" : "smtp_not_configured" };
    if (settings.provider === "brevo") {
      const response = await fetch("https://api.brevo.com/v3/smtp/email", { method: "POST", signal: AbortSignal.timeout(10000), headers: { "api-key": process.env.BREVO_API_KEY!, "content-type": "application/json", accept: "application/json" }, body: JSON.stringify({ sender: { name: process.env.BREVO_SENDER_NAME ?? "A2E Renovation", email: config.from }, to: recipients.map(email => ({ email })), replyTo: input.replyTo ? { email: input.replyTo } : undefined, subject: input.subject, htmlContent: input.html, textContent: input.text, attachment: input.attachment ? [{ content: Buffer.from(input.attachment.content).toString("base64"), name: input.attachment.filename }] : undefined }) });
      if (!response.ok) return { ok: false, reason: `provider_http_${response.status}` };
      return { ok: true, acceptedCount: recipients.length, rejectedCount: 0 };
    }
    const transport = nodemailer.createTransport({ host: config.host, port: config.port, secure: config.secure, auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASSWORD! }, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000 });
    try {
      const result = await transport.sendMail({ from: config.from, to: recipients.join(","), replyTo: input.replyTo, subject: input.subject, html: input.html, text: input.text, attachments: input.attachment ? [{ filename: input.attachment.filename, content: Buffer.from(input.attachment.content) }] : undefined });
      const acceptedCount = Array.isArray(result.accepted) ? result.accepted.length : 0;
      const rejectedCount = Array.isArray(result.rejected) ? result.rejected.length : 0;
      if (acceptedCount < recipients.length || rejectedCount) return { ok: false, reason: acceptedCount ? "partial_rejection" : "all_recipients_rejected", acceptedCount, rejectedCount, partial: acceptedCount > 0 };
      return { ok: true, acceptedCount, rejectedCount };
    } finally { transport.close(); }
  } catch (error) {
    const reason = error instanceof Error && /^notification_settings_(unavailable|invalid)$/.test(error.message) ? error.message : "transport_failed";
    return { ok: false, reason };
  }
}

export async function recordNotificationOutcome(id: string, outcome: DeliveryResult, payload: { leadId?: string; estimateId?: string; recipientCount: number }) {
  try {
    await prisma.webhookEvent.update({ where: { id }, data: { status: outcome.ok ? "sent" : outcome.partial ? "partial" : "failed", payload: { ...payload, ...(outcome.reason ? { reason: outcome.reason } : {}), ...(outcome.acceptedCount === undefined ? {} : { acceptedCount: outcome.acceptedCount }), ...(outcome.rejectedCount === undefined ? {} : { rejectedCount: outcome.rejectedCount }) } } });
    return true;
  } catch { return false; }
}

/** One recorded attempt per event and estimate; failures remain inspectable in admin. */
export async function sendLeadNotification(input: LeadNotificationInput, estimateId?: string) {
  let settings: NotificationSettingsValue;
  try { settings = await getNotificationSettings({ strict: true }); }
  catch { return { sent: false, reason: "notification_settings_unavailable" }; }
  const event = input.event ?? "pdfGenerated", recipients = validateRecipients(settings.recipients);
  const ledgerId = estimateId ? `notification-${event}-${estimateId}` : undefined;
  if (!ledgerId) return { sent: false, reason: "missing_estimate_id" };
  const payload = { estimateId, recipientCount: recipients.length };
  try { await prisma.webhookEvent.create({ data: { id: ledgerId, name: `notification.${event}`, payload, status: "pending" } }); }
  catch { return { sent: false, reason: "already_attempted_or_log_unavailable" }; }
  if (!settings.events[event] || !recipients.length) {
    const reason = !settings.events[event] ? "event_disabled" : "no_recipients";
    await prisma.webhookEvent.update({ where: { id: ledgerId }, data: { status: "skipped", payload: { ...payload, reason } } }).catch(() => undefined);
    return { sent: false, reason };
  }
  const outcome = await deliverNotificationEmail({ recipients, ...notificationContent(input), text: [`Dossier ${input.number ?? "A2E"}`, input.name, input.email ?? "", input.phone ?? "", `Fourchette indicative : ${input.low} a ${input.high} EUR`].join("\n"), replyTo: input.email, attachment: input.pdf ? { filename: `pre-devis-${input.number ?? "a2e"}.pdf`, content: input.pdf } : undefined }, settings);
  const logConfirmed = await recordNotificationOutcome(ledgerId, outcome, payload);
  return { sent: outcome.ok, partial: outcome.partial, reason: logConfirmed ? outcome.reason : "delivery_log_unconfirmed", logConfirmed };
}
