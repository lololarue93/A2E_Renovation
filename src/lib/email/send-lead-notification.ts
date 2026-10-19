import { getNotificationSettings, type NotificationSettingsValue } from "@/lib/settings/notification-settings";
import { notificationContent, type LeadNotificationInput } from "./notification-content";
import { prisma } from "@/lib/db/prisma";
import { validateRecipients } from "./recipient-list";
import { notificationListRecipients, resolveMailConnector } from "./mail-store";
import { deliverWithConnector } from "./mail-transport";
import { safeTransportReason } from "./mail-errors";
export { validateRecipients } from "./recipient-list";

export type DeliveryResult = { ok: boolean; reason?: string; acceptedCount?: number; rejectedCount?: number; partial?: boolean };
export async function deliverNotificationEmail(input: { recipients: string[]; subject: string; html: string; text: string; replyTo?: string; attachment?: { filename: string; content: Uint8Array } }, chosenSettings?: Pick<NotificationSettingsValue, "provider">): Promise<DeliveryResult> {
  const recipients = validateRecipients(input.recipients, 50);
  if (!recipients.length) return { ok: false, reason: "no_recipients" };
  try {
    const settings = chosenSettings ?? await getNotificationSettings({ strict: true });
    return await deliverWithConnector({ ...input, recipients }, await resolveMailConnector(undefined, settings.provider));
  } catch (error) {
    const reason = error instanceof Error && /^notification_settings_(unavailable|invalid)$/.test(error.message) ? error.message : safeTransportReason(error);
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
  const event = input.event ?? "pdfGenerated";
  let recipients = validateRecipients(settings.recipients, 50), recipientError = "";
  if (settings.events[event]) {
    try { recipients = validateRecipients(await notificationListRecipients(settings.recipients), 50); }
    catch (error) { recipientError = safeTransportReason(error); }
  }
  const ledgerId = estimateId ? `notification-${event}-${estimateId}` : undefined;
  if (!ledgerId) return { sent: false, reason: "missing_estimate_id" };
  const payload = { estimateId, recipientCount: recipients.length };
  try { await prisma.webhookEvent.create({ data: { id: ledgerId, name: `notification.${event}`, payload, status: "pending" } }); }
  catch { return { sent: false, reason: "already_attempted_or_log_unavailable" }; }
  if (recipientError) { await recordNotificationOutcome(ledgerId, { ok: false, reason: recipientError }, payload); return { sent: false, reason: recipientError }; }
  if (!settings.events[event] || !recipients.length) {
    const reason = !settings.events[event] ? "event_disabled" : "no_recipients";
    await prisma.webhookEvent.update({ where: { id: ledgerId }, data: { status: "skipped", payload: { ...payload, reason } } }).catch(() => undefined);
    return { sent: false, reason };
  }
  const outcome = await deliverNotificationEmail({ recipients, ...notificationContent(input), replyTo: input.email || undefined, attachment: input.pdf ? { filename: `pre-devis-${input.number ?? "a2e"}.pdf`, content: input.pdf } : undefined }, settings);
  const logConfirmed = await recordNotificationOutcome(ledgerId, outcome, payload);
  return { sent: outcome.ok, partial: outcome.partial, reason: logConfirmed ? outcome.reason : "delivery_log_unconfirmed", logConfirmed };
}
