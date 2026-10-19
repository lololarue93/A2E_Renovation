import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";
import { defaultNotificationSettings, type NotificationSettingsValue } from "@/lib/settings/notification-settings";
import { defaultSiteContactSettings, type SiteContactSettings } from "@/lib/settings/site-contact-settings";
import { emailTransportConfig } from "@/lib/email/transport-config";

export const dynamic = "force-dynamic";
export const revalidate = 0;
const socialUrl = z.string().trim().max(300).refine((value) => {
  if (!value) return true;
  try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol); } catch { return false; }
}, "Utilisez une URL http ou https valide.");
const settingsSchema = z.object({
  provider: z.enum(["brevo", "smtp", "ovh", "gmail"]),
  leadEmail: z.union([z.string().trim().toLowerCase().email().max(160), z.literal("")]),
  recipients: z.array(z.string().trim().toLowerCase().email().max(160)).min(1).max(20),
  events: z.object({ leadCreated: z.boolean(), pdfGenerated: z.boolean(), mediaUploaded: z.boolean(), securityAlert: z.boolean() }).strict(),
  telegramEnabled: z.boolean(), trackingEnabled: z.boolean(),
  signatureDiscountPercent: z.number().finite().min(0).max(15), signatureWindowDays: z.number().int().min(1).max(60),
  phone: z.string().trim().min(6).max(40).refine((value) => /^[+\d\s().-]+$/.test(value), "Telephone invalide."),
  instagram: socialUrl, facebook: socialUrl, linkedin: socialUrl
}).strict();

export async function GET(request: NextRequest) {
  const denied = requireAdmin(request); if (denied) return denied;
  try {
    const rows = await prisma.siteSettings.findMany({ where: { key: { in: ["notifications", "site_contact"] } } });
    const notificationRow = rows.find((row) => row.key === "notifications");
    const contactRow = rows.find((row) => row.key === "site_contact");
    const stored = notificationRow?.value && typeof notificationRow.value === "object" && !Array.isArray(notificationRow.value) ? notificationRow.value as Partial<NotificationSettingsValue> : {};
    const storedContact = contactRow?.value && typeof contactRow.value === "object" && !Array.isArray(contactRow.value) ? contactRow.value as Partial<SiteContactSettings> : {};
    const combined = { ...defaultNotificationSettings, ...stored, recipients: stored.recipients?.length ? stored.recipients : [stored.leadEmail || defaultNotificationSettings.leadEmail], events: { ...defaultNotificationSettings.events, ...stored.events }, ...defaultSiteContactSettings, ...storedContact };
    const parsed = settingsSchema.safeParse(combined);
    if (!parsed.success) return NextResponse.json({ error: "La configuration stockee contient des valeurs invalides. Corrigez les reglages en base avant de poursuivre." }, { status: 503 });
    const { phone, instagram, facebook, linkedin, ...settings } = parsed.data;
    return NextResponse.json({
      settings, contact: { phone, instagram, facebook, linkedin },
      saved: { notifications: Boolean(notificationRow), contact: Boolean(contactRow) },
      brevoConfigured: emailTransportConfig("brevo").configured,
      smtpConfigured: emailTransportConfig(settings.provider === "brevo" ? "smtp" : settings.provider).configured,
      transports: Object.fromEntries((["brevo", "smtp", "ovh", "gmail"] as const).map(provider => { const config = emailTransportConfig(provider); return [provider, { configured: config.configured, missing: config.missing }]; })),
      telegramConfigured: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID)
    }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "La base est indisponible. Les reglages n'ont pas pu etre charges." }, { status: 503 }); }
}

export async function PUT(request: NextRequest) {
  const denied = requireAdmin(request); if (denied) return denied;
  const parsed = settingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Verifiez les emails (1 a 20 destinataires), le telephone, les URL et la validite commerciale (0 a 15 %, 1 a 60 jours).", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  const { phone, instagram, facebook, linkedin, ...input } = parsed.data;
  const settings: NotificationSettingsValue = { ...input, leadEmail: input.leadEmail || input.recipients[0], recipients: [...new Set(input.recipients)] };
  const contact: SiteContactSettings = { phone, instagram, facebook, linkedin };
  try {
    await prisma.$transaction([
      prisma.siteSettings.upsert({ where: { key: "notifications" }, update: { value: settings }, create: { key: "notifications", value: settings } }),
      prisma.siteSettings.upsert({ where: { key: "site_contact" }, update: { value: contact }, create: { key: "site_contact", value: contact } }),
      prisma.auditLog.create({ data: { actor: process.env.ADMIN_EMAIL, action: "settings.updated", entity: "SiteSettings", entityId: "notifications", payload: { settings, contact } } })
    ]);
    return NextResponse.json({ ok: true, settings, contact });
  } catch { return NextResponse.json({ error: "Enregistrement impossible. Les reglages n'ont pas ete confirmes en base." }, { status: 503 }); }
}
