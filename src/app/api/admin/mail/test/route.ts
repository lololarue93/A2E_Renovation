import { requireAdmin, getRequestActor } from "@/lib/auth/require-admin";
import { sendManualMail, testMailSchema } from "@/lib/email/manual-mail";
import { mailApiError, mailJson, readMailBody } from "@/lib/email/mail-api";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const denied = await requireAdmin(request, "connectors:manage"); if (denied) return denied;
  try {
    const parsed = testMailSchema.safeParse(await readMailBody(request, 2000));
    if (!parsed.success) return mailJson({ error: "Indiquez une adresse de test et un identifiant de tentative valide." }, 400);
    const result = await sendManualMail({ action: "send", requestId: parsed.data.requestId, connectorId: parsed.data.connectorId, listIds: [], recipients: [parsed.data.to], consentConfirmed: true, subject: "A2E - Test du connecteur email", message: "Ceci est un email de test demande depuis l'administration A2E. Verifiez sa reception et le dossier des courriers indesirables. Aucun client n'a ete contacte automatiquement." }, await getRequestActor(request), "test");
    return mailJson({ ok: result.status === "sent", result }, result.status === "pending" ? 202 : 200);
  } catch (error) { return mailApiError(error); }
}
