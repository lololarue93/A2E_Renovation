import { requireAdmin, getRequestActor } from "@/lib/auth/require-admin";
import { connectorsInputSchema, mailConnectorsView, saveMailConnectors } from "@/lib/email/mail-store";
import { getNotificationSettings } from "@/lib/settings/notification-settings";
import { mailApiError, mailJson, readMailBody } from "@/lib/email/mail-api";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const denied = await requireAdmin(request, "mail:read"); if (denied) return denied;
  try { const settings = await getNotificationSettings({ strict: true }); return mailJson(await mailConnectorsView(settings.provider)); } catch (error) { return mailApiError(error); }
}
export async function PUT(request: Request) {
  const denied = await requireAdmin(request, "connectors:manage"); if (denied) return denied;
  try {
    const parsed = connectorsInputSchema.safeParse(await readMailBody(request));
    if (!parsed.success) return mailJson({ error: "Verifiez les connecteurs, les ports 465 TLS ou 587 STARTTLS et les longueurs des champs." }, 400);
    return mailJson({ ok: true, ...await saveMailConnectors(parsed.data, await getRequestActor(request)) });
  } catch (error) { return mailApiError(error); }
}
