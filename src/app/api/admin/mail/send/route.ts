import { requireAdmin, getRequestActor } from "@/lib/auth/require-admin";
import { composeMailSchema, prepareManualMail, sendManualMail } from "@/lib/email/manual-mail";
import { mailApiError, mailJson, readMailBody } from "@/lib/email/mail-api";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
export async function POST(request: Request) {
  const denied = await requireAdmin(request, "mail:send"); if (denied) return denied;
  try {
    const parsed = composeMailSchema.safeParse(await readMailBody(request, 50000));
    if (!parsed.success) return mailJson({ error: "Verifiez l'objet, le message, les destinataires et l'identifiant d'envoi." }, 400);
    if (parsed.data.action === "preview") return mailJson({ ok: true, preview: (await prepareManualMail(parsed.data)).preview });
    const result = await sendManualMail(parsed.data, await getRequestActor(request));
    return mailJson({ ok: result.status === "sent", result }, result.status === "pending" ? 202 : 200);
  } catch (error) { return mailApiError(error); }
}
