import { prisma } from "@/lib/db/prisma";

export type NotificationSettingsValue = {
  provider: "brevo" | "ovh";
  leadEmail: string;
  telegramEnabled: boolean;
  trackingEnabled: boolean;
  signatureDiscountPercent: number;
  signatureWindowDays: number;
};

export const defaultNotificationSettings: NotificationSettingsValue = {
  provider: "brevo",
  leadEmail: "julien.c@ags-a2e.com",
  telegramEnabled: false,
  trackingEnabled: true,
  signatureDiscountPercent: 5,
  signatureWindowDays: 15
};

export async function getNotificationSettings() {
  const row = await prisma.siteSettings.findUnique({ where: { key: "notifications" } }).catch(() => null);
  if (!row || !row.value || typeof row.value !== "object" || Array.isArray(row.value)) return defaultNotificationSettings;
  return { ...defaultNotificationSettings, ...(row.value as Partial<NotificationSettingsValue>) };
}
