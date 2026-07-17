import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { defaultNotificationSettings, getNotificationSettings, type NotificationSettingsValue } from "@/lib/settings/notification-settings";

export async function GET() {
  const settings = await getNotificationSettings();
  return NextResponse.json({
    settings,
    brevoConfigured: Boolean(process.env.BREVO_API_KEY && process.env.BREVO_SENDER_EMAIL),
    telegramConfigured: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID)
  });
}

export async function PUT(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const current = await getNotificationSettings();
  const settings: NotificationSettingsValue = {
    provider: body.provider === "ovh" ? "ovh" : "brevo",
    leadEmail: typeof body.leadEmail === "string" && body.leadEmail.includes("@") ? body.leadEmail.slice(0, 160) : current.leadEmail,
    telegramEnabled: Boolean(body.telegramEnabled),
    trackingEnabled: body.trackingEnabled !== false,
    signatureDiscountPercent: Math.min(15, Math.max(0, Number(body.signatureDiscountPercent) || defaultNotificationSettings.signatureDiscountPercent)),
    signatureWindowDays: Math.min(60, Math.max(1, Number(body.signatureWindowDays) || defaultNotificationSettings.signatureWindowDays))
  };
  await prisma.siteSettings.upsert({ where: { key: "notifications" }, update: { value: settings }, create: { key: "notifications", value: settings } });
  await prisma.auditLog.create({ data: { actor: "admin", action: "settings.updated", entity: "SiteSettings", entityId: "notifications", payload: settings } }).catch(() => undefined);
  return NextResponse.json({ ok: true, settings });
}
