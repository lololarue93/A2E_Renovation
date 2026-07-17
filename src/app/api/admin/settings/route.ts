import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { defaultNotificationSettings, getNotificationSettings, type NotificationSettingsValue } from "@/lib/settings/notification-settings";
import { getSiteContactSettings, type SiteContactSettings } from "@/lib/settings/site-contact-settings";

export async function GET() {
  const settings = await getNotificationSettings();
  const contact = await getSiteContactSettings();
  return NextResponse.json({
    settings,
    contact,
    brevoConfigured: Boolean(process.env.BREVO_API_KEY && process.env.BREVO_SENDER_EMAIL),
    telegramConfigured: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID)
  });
}

export async function PUT(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const current = await getNotificationSettings();
  const currentContact = await getSiteContactSettings();
  const settings: NotificationSettingsValue = {
    provider: body.provider === "ovh" ? "ovh" : "brevo",
    leadEmail: typeof body.leadEmail === "string" && body.leadEmail.includes("@") ? body.leadEmail.slice(0, 160) : current.leadEmail,
    telegramEnabled: Boolean(body.telegramEnabled),
    trackingEnabled: body.trackingEnabled !== false,
    signatureDiscountPercent: Math.min(15, Math.max(0, Number(body.signatureDiscountPercent) || defaultNotificationSettings.signatureDiscountPercent)),
    signatureWindowDays: Math.min(60, Math.max(1, Number(body.signatureWindowDays) || defaultNotificationSettings.signatureWindowDays))
  };
  const contact: SiteContactSettings = {
    phone: typeof body.phone === "string" && body.phone.trim() ? body.phone.trim().slice(0, 40) : currentContact.phone,
    instagram: typeof body.instagram === "string" ? body.instagram.trim().slice(0, 300) : currentContact.instagram,
    facebook: typeof body.facebook === "string" ? body.facebook.trim().slice(0, 300) : currentContact.facebook,
    linkedin: typeof body.linkedin === "string" ? body.linkedin.trim().slice(0, 300) : currentContact.linkedin
  };
  await prisma.siteSettings.upsert({ where: { key: "notifications" }, update: { value: settings }, create: { key: "notifications", value: settings } });
  await prisma.siteSettings.upsert({ where: { key: "site_contact" }, update: { value: contact }, create: { key: "site_contact", value: contact } });
  await prisma.auditLog.create({ data: { actor: "admin", action: "settings.updated", entity: "SiteSettings", entityId: "notifications", payload: { settings, contact } } }).catch(() => undefined);
  return NextResponse.json({ ok: true, settings, contact });
}
