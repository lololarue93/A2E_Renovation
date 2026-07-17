import { getNotificationSettings } from "@/lib/settings/notification-settings";

type LeadNotificationInput = {
  name: string;
  email?: string;
  phone?: string;
  city?: string;
  number?: string;
  low: number;
  mid: number;
  high: number;
  pdf: Uint8Array;
};

const euro = (value: number) => `${value.toLocaleString("fr-FR")} EUR`;

export async function sendLeadNotification(input: LeadNotificationInput) {
  const notificationSettings = await getNotificationSettings();
  const apiKey = process.env.BREVO_API_KEY;
  const recipient = notificationSettings.leadEmail || process.env.LEAD_NOTIFICATION_EMAIL;
  const sender = process.env.BREVO_SENDER_EMAIL;
  if (notificationSettings.provider !== "brevo" || !apiKey || !recipient || !sender) return { sent: false, reason: "email_not_configured" as const };

  const discountMid = Math.round((input.mid * 0.95) / 50) * 50;
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": apiKey, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sender: { name: process.env.BREVO_SENDER_NAME ?? "A2E Renovation", email: sender },
      to: [{ email: recipient, name: "Julien CHARRIERE" }],
      replyTo: input.email ? { email: input.email, name: input.name } : undefined,
      subject: `Nouveau pre-devis A2E - ${input.name} - ${euro(input.mid)}`,
      htmlContent: `<h2>Nouveau lead A2E Renovation</h2><p><strong>Client :</strong> ${input.name}</p><p><strong>Email :</strong> ${input.email ?? "Non renseigne"}<br><strong>Telephone :</strong> ${input.phone ?? "Non renseigne"}<br><strong>Zone :</strong> ${input.city ?? "Ile-de-France"}</p><p><strong>Document :</strong> ${input.number ?? "Pre-devis"}<br><strong>Fourchette :</strong> ${euro(input.low)} / ${euro(input.mid)} / ${euro(input.high)}</p><p><strong>Avantage conditionnel :</strong> projection de 5 % si validation du devis contractuel sous 15 jours : ${euro(discountMid)} au niveau central.</p>`,
      attachment: [{ content: Buffer.from(input.pdf).toString("base64"), name: `pre-devis-${input.number ?? "a2e"}.pdf` }]
    })
  });
  if (!response.ok) throw new Error(`Brevo returned ${response.status}`);
  return { sent: true as const };
}
