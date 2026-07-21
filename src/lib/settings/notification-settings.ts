import { prisma } from "@/lib/db/prisma";

export type NotificationSettingsValue = {
  provider: "brevo" | "smtp" | "ovh" | "gmail";
  leadEmail: string;
  recipients: string[];
  events: {
    leadCreated: boolean;
    pdfGenerated: boolean;
    mediaUploaded: boolean;
    securityAlert: boolean;
  };
  telegramEnabled: boolean;
  trackingEnabled: boolean;
  signatureDiscountPercent: number;
  signatureWindowDays: number;
};

export const defaultNotificationSettings: NotificationSettingsValue = {
  provider: "brevo",
  leadEmail: "julien.c@ags-a2e.com",
  recipients: ["julien.c@ags-a2e.com"],
  events: { leadCreated: false, pdfGenerated: true, mediaUploaded: false, securityAlert: true },
  telegramEnabled: false,
  trackingEnabled: true,
  signatureDiscountPercent: 5,
  signatureWindowDays: 15
};

export async function getNotificationSettings() {
  const row = await prisma.siteSettings.findUnique({ where: { key: "notifications" } }).catch(() => null);
  if (!row || !row.value || typeof row.value !== "object" || Array.isArray(row.value)) return defaultNotificationSettings;
  const value = row.value as Partial<NotificationSettingsValue>;
  const events = value.events && typeof value.events === "object" ? value.events : {};
  const recipients = Array.isArray(value.recipients) ? value.recipients.filter((item): item is string => typeof item === "string") : [];
  return {
    ...defaultNotificationSettings,
    ...value,
    recipients: recipients.length ? recipients : [value.leadEmail || defaultNotificationSettings.leadEmail],
    events: { ...defaultNotificationSettings.events, ...events }
  };
}
