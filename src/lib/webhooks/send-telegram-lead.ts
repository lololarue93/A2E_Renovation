import type { LeadPayload } from "@/lib/validators/lead.schema";
import { getNotificationSettings } from "@/lib/settings/notification-settings";
import { projectRequestContent } from "@/lib/email/notification-content";

export async function sendTelegramLead(lead: LeadPayload, adminUrl?: string) {
  const settings = await getNotificationSettings();
  if (!settings.telegramEnabled || process.env.TELEGRAM_LEADS_ENABLED !== "true" || !process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
    console.info("Telegram not configured");
    return { sent: false, reason: "not_configured" };
  }

  const projectType = String(lead.input.projectType ?? "non précisé");
  const city = String(lead.input.city ?? "non précisé");
  const urgency = String(lead.input.urgency ?? "non précisé");
  const requestDetails = projectRequestContent(lead).text;
  const message = [
    "Nouveau lead A2E Rénovation",
    `Nom: ${lead.name}`,
    `Téléphone: ${lead.phone}`,
    `Email: ${lead.email}`,
    `Ville: ${city}`,
    `Type de projet: ${projectType}`,
    `Budget: ${lead.result.low} / ${lead.result.mid} / ${lead.result.high} €`,
    `Urgence: ${urgency}`,
    `Score maturité: ${lead.result.maturityScore}/100`,
    requestDetails.length > 2200 ? `${requestDetails.slice(0, 2200)}\n[Suite disponible dans le dossier admin]` : requestDetails,
    `Admin: ${adminUrl ?? "/admin"}`
  ].join("\n");

  const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    signal: AbortSignal.timeout(10000),
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: process.env.TELEGRAM_CHAT_ID, text: message })
  });

  if (!response.ok) {
    console.error("Telegram lead webhook failed", response.status);
    return { sent: false, reason: "telegram_error" };
  }

  return { sent: true };
}
