import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getNotificationSettings } from "@/lib/settings/notification-settings";
import { escapeHtml } from "./notification-content";
import { MailServiceError, mailReasonMessage } from "./mail-errors";
import { readMailLists, resolveMailConnector } from "./mail-store";
import { deliverWithConnector } from "./mail-transport";
import type { MailComposeInput, MailPreview, MailSendResult } from "./mail-contract";
import { mailActionSignature } from "./mail-secrets";

export const composeMailSchema = z.object({ action: z.enum(["preview", "send"]), requestId: z.string().uuid(), connectorId: z.string().max(100).optional(), listIds: z.array(z.string().uuid()).max(20).default([]), recipients: z.array(z.string().trim().toLowerCase().email().max(160)).max(50).default([]), consentConfirmed: z.boolean().default(false), subject: z.string().trim().min(1).max(180).refine(value => !/[\r\n]/.test(value)), message: z.string().trim().min(1).max(12000), previewToken: z.string().regex(/^[a-f0-9]{64}$/).optional() }).strict();
export const testMailSchema = z.object({ requestId: z.string().uuid(), connectorId: z.string().min(1).max(100), to: z.string().trim().toLowerCase().email().max(160) }).strict();

export async function prepareManualMail(input: MailComposeInput) {
  if (input.recipients.length && !input.consentConfirmed) throw new MailServiceError("mail_consent_required");
  const store = await readMailLists();
  const eligible = new Map<string, { email: string; name: string }>();
  const excluded = new Set<string>();
  for (const id of input.listIds) {
    const list = store.lists.find(item => item.id === id); if (!list) throw new MailServiceError("mail_list_invalid");
    for (const member of list.members) {
      if (list.type === "clients" && !member.consent) { excluded.add(member.email); continue; }
      eligible.set(member.email, { email: member.email, name: member.name || "" });
    }
  }
  // An explicit refusal on a client list is never bypassed by a duplicate team or
  // manually entered address in the same composition.
  for (const email of input.recipients) eligible.set(email, { email, name: "" });
  for (const email of excluded) eligible.delete(email);
  if (!eligible.size || eligible.size > 50) throw new MailServiceError("mail_destination_invalid");
  const settings = await getNotificationSettings({ strict: true });
  const connector = await resolveMailConnector(input.connectorId, settings.provider);
  const recipients = [...eligible.values()].sort((a, b) => a.email.localeCompare(b.email));
  const snapshot = { connectorId: connector.id, fromEmail: connector.fromEmail, fromName: connector.fromName, subject: input.subject, message: input.message, recipients, recipientCount: recipients.length, excludedCount: excluded.size };
  // Bind the transport too. Its secret participates only inside an HMAC; neither
  // plaintext nor a reusable credential fingerprint leaves the server.
  const transportSignature = mailActionSignature(JSON.stringify(connector));
  const preview: MailPreview = { ...snapshot, previewToken: mailActionSignature(JSON.stringify({ requestId: input.requestId, ...snapshot, transportSignature })) };
  return { preview, connector };
}
function count(value: unknown) { return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : 0; }
function resultFrom(id: string, status: string, payload: unknown, duplicate: boolean): MailSendResult {
  const value = payload && typeof payload === "object" && !Array.isArray(payload) ? payload as Record<string, unknown> : {};
  const state = ["sent", "partial", "failed"].includes(status) ? status as "sent" | "partial" | "failed" : "pending";
  return { id, status: state, recipientCount: count(value.recipientCount), acceptedCount: count(value.acceptedCount), rejectedCount: count(value.rejectedCount), failedCount: count(value.failedCount), duplicate, message: duplicate ? "Tentative deja enregistree. Aucun destinataire n'a ete reexpedie. Consultez le journal si le resultat est en attente." : "Resultat d'acceptation du fournisseur enregistre. La reception reste a verifier." };
}
export async function sendManualMail(input: MailComposeInput, actor: string | null, kind: "manual" | "test" = "manual") {
  const { preview, connector } = await prepareManualMail(input);
  if (kind === "manual" && (!input.previewToken || input.previewToken.length !== preview.previewToken.length || !timingSafeEqual(Buffer.from(input.previewToken), Buffer.from(preview.previewToken)))) throw new MailServiceError("mail_preview_stale", 409);
  const requestHash = createHash("sha256").update(JSON.stringify(preview)).digest("hex");
  const id = `mail-send-${input.requestId}`;
  const payload = { requestHash, actor, connectorId: connector.id, connectorName: connector.name, subject: input.subject, recipientCount: preview.recipientCount, acceptedCount: 0, rejectedCount: 0, failedCount: 0, excludedCount: preview.excludedCount };
  try {
    await prisma.$transaction(async tx => {
      await tx.webhookEvent.create({ data: { id, name: `mail.${kind}`, status: "pending", payload } });
      await tx.auditLog.create({ data: { actor, action: "mail.send_requested", entity: "WebhookEvent", entityId: id, payload: { connectorId: connector.id, recipientCount: preview.recipientCount, kind } } });
    });
  } catch {
    const existing = await prisma.webhookEvent.findUnique({ where: { id } }).catch(() => null);
    if (!existing) throw new MailServiceError("mail_log_unavailable", 503);
    const prior = existing.payload && typeof existing.payload === "object" && !Array.isArray(existing.payload) ? existing.payload as Record<string, unknown> : {};
    if (prior.requestHash !== requestHash) throw new MailServiceError("mail_request_conflict", 409);
    return resultFrom(id, existing.status, existing.payload, true);
  }
  let index = 0, logConfirmed = true;
  const outcomes = { acceptedCount: 0, rejectedCount: 0, failedCount: 0 };
  const worker = async () => {
    while (index < preview.recipients.length) {
      const recipient = preview.recipients[index++];
      const deliveryId = `${id}-${createHash("sha256").update(recipient.email).digest("hex").slice(0, 24)}`;
      const detail = { parentId: id, actor, connectorId: connector.id, connectorName: connector.name, recipient: recipient.email, recipientCount: 1, subject: input.subject };
      try { await prisma.webhookEvent.create({ data: { id: deliveryId, name: "mail.delivery", status: "pending", payload: detail } }); }
      catch { outcomes.failedCount++; logConfirmed = false; continue; }
      const outcome = await deliverWithConnector({ recipients: [recipient.email], subject: input.subject, text: input.message, html: `<div style="font-family:Arial,sans-serif;line-height:1.7">${escapeHtml(input.message).replace(/\n/g, "<br>")}</div>` }, connector);
      outcomes.acceptedCount += outcome.acceptedCount > 0 ? 1 : 0;
      outcomes.rejectedCount += outcome.rejectedCount > 0 ? 1 : 0;
      outcomes.failedCount += !outcome.acceptedCount && !outcome.rejectedCount ? 1 : 0;
      try { await prisma.webhookEvent.update({ where: { id: deliveryId }, data: { status: outcome.ok ? "sent" : outcome.rejectedCount ? "rejected" : "failed", payload: { ...detail, ...outcome } } }); }
      catch { logConfirmed = false; }
    }
  };
  await Promise.all(Array.from({ length: Math.min(3, preview.recipientCount) }, worker));
  const status = outcomes.acceptedCount === preview.recipientCount ? "sent" : outcomes.acceptedCount ? "partial" : "failed";
  const saved = { ...payload, ...outcomes, ...(!logConfirmed ? { reason: "mail_log_unavailable" } : {}) };
  try { await prisma.webhookEvent.update({ where: { id }, data: { status, payload: saved } }); }
  catch { throw new MailServiceError("mail_log_unavailable", 503); }
  const result = resultFrom(id, status, saved, false);
  if (!logConfirmed) result.message = "Resultat partiellement journalise. Verifiez le fournisseur avant de creer une nouvelle tentative.";
  return result;
}
export function safeMailLog(row: { id: string; name: string; status: string; payload: unknown; createdAt: Date }) {
  const value = row.payload && typeof row.payload === "object" && !Array.isArray(row.payload) ? row.payload as Record<string, unknown> : {};
  const text = (key: string, maximum = 180) => typeof value[key] === "string" ? String(value[key]).slice(0, maximum) : null;
  return { id: row.id, name: row.name, status: row.status, createdAt: row.createdAt, subject: text("subject"), connectorName: text("connectorName", 100), actor: text("actor", 160), recipient: text("recipient", 160), recipientCount: count(value.recipientCount), acceptedCount: count(value.acceptedCount), rejectedCount: count(value.rejectedCount), failedCount: count(value.failedCount), reason: typeof value.reason === "string" ? mailReasonMessage(value.reason) : null };
}
