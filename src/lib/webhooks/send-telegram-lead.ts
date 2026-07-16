import type { LeadPayload } from "@/lib/validators/lead.schema";

export async function sendTelegramLead(lead: LeadPayload, adminUrl?: string) {
  if (process.env.TELEGRAM_LEADS_ENABLED !== "true" || !process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
    console.info("Telegram not configured");
    return { sent: false, reason: "not_configured" };
  }

  const projectType = String(lead.input.projectType ?? "non précisé");
  const city = String(lead.input.city ?? "non précisé");
  const urgency = String(lead.input.urgency ?? "non précisé");
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
    `Admin: ${adminUrl ?? "/admin"}`
  ].join("\n");

  const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: process.env.TELEGRAM_CHAT_ID, text: message })
  });

  if (!response.ok) {
    console.error("Telegram lead webhook failed", await response.text());
    return { sent: false, reason: "telegram_error" };
  }

  return { sent: true };
}
