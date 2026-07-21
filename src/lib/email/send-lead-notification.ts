import { getNotificationSettings } from "@/lib/settings/notification-settings";
import nodemailer from "nodemailer";

type LeadNotificationInput = {
  name: string;
  email?: string;
  phone?: string;
  city?: string;
  number?: string;
  low: number;
  mid: number;
  high: number;
  pdf?: Uint8Array;
  event?: "leadCreated" | "pdfGenerated";
};

const euro = (value: number) => `${value.toLocaleString("fr-FR")} EUR`;

export async function sendLeadNotification(input: LeadNotificationInput) {
  const notificationSettings = await getNotificationSettings();
  const apiKey = process.env.BREVO_API_KEY;
  const recipients = notificationSettings.recipients.length ? notificationSettings.recipients : [notificationSettings.leadEmail || process.env.LEAD_NOTIFICATION_EMAIL].filter(Boolean) as string[];
  const sender = process.env.BREVO_SENDER_EMAIL;
  const event = input.event ?? "pdfGenerated";
  if (!notificationSettings.events[event] || !recipients.length) return { sent: false, reason: "event_disabled" as const };

  const discountMid = Math.round((input.mid * 0.95) / 50) * 50;
  const html = `<h2>Nouveau pre-devis A2E Renovation</h2><p><strong>Client :</strong> ${input.name}</p><p><strong>Email :</strong> ${input.email ?? "Non renseigne"}<br><strong>Telephone :</strong> ${input.phone ?? "Non renseigne"}<br><strong>Zone :</strong> ${input.city ?? "Ile-de-France"}</p><p><strong>Document :</strong> ${input.number ?? "Pre-devis"}<br><strong>Fourchette :</strong> ${euro(input.low)} / ${euro(input.mid)} / ${euro(input.high)}</p><p><strong>Avantage conditionnel :</strong> projection de 5 % si validation du devis contractuel sous 15 jours : ${euro(discountMid)} au niveau central.</p>`;
  if (notificationSettings.provider === "brevo") {
    if (!apiKey || !sender) return { sent: false, reason: "brevo_not_configured" as const };
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": apiKey, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sender: { name: process.env.BREVO_SENDER_NAME ?? "A2E Renovation", email: sender },
      to: recipients.map((email) => ({ email })),
      replyTo: input.email ? { email: input.email, name: input.name } : undefined,
      subject: `Nouveau pre-devis A2E - ${input.name} - ${euro(input.mid)}`,
      htmlContent: html,
      attachment: input.pdf ? [{ content: Buffer.from(input.pdf).toString("base64"), name: `pre-devis-${input.number ?? "a2e"}.pdf` }] : undefined
    })
    });
    if (!response.ok) throw new Error(`Brevo returned ${response.status}`);
    return { sent: true as const, provider: "brevo" as const };
  }

  const host = process.env.SMTP_HOST || (notificationSettings.provider === "gmail" ? "smtp.gmail.com" : "ssl0.ovh.net");
  const port = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER || sender;
  const password = process.env.SMTP_PASSWORD;
  if (!user || !password) return { sent: false, reason: "smtp_not_configured" as const };
  const transport = nodemailer.createTransport({ host, port, secure: process.env.SMTP_SECURE !== "false", auth: { user, pass: password } });
  await transport.sendMail({ from: sender || user, to: recipients.join(","), replyTo: input.email || undefined, subject: `Nouveau pre-devis A2E - ${input.name} - ${euro(input.mid)}`, html, attachments: input.pdf ? [{ filename: `pre-devis-${input.number ?? "a2e"}.pdf`, content: Buffer.from(input.pdf) }] : undefined });
  return { sent: true as const, provider: notificationSettings.provider };
}
