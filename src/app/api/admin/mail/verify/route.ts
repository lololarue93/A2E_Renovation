import { randomUUID } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin, getRequestActor } from "@/lib/auth/require-admin";
import { resolveMailConnector } from "@/lib/email/mail-store";
import { verifyMailConnector } from "@/lib/email/mail-transport";
import { mailApiError, mailJson, readMailBody } from "@/lib/email/mail-api";
import { mailReasonMessage } from "@/lib/email/mail-errors";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const denied = await requireAdmin(request, "connectors:manage"); if (denied) return denied;
  try {
    const parsed = z.object({ connectorId: z.string().min(1).max(100) }).strict().safeParse(await readMailBody(request, 1000));
    if (!parsed.success) return mailJson({ error: "Choisissez un connecteur enregistre." }, 400);
    const connector = await resolveMailConnector(parsed.data.connectorId);
    const actor = await getRequestActor(request), id = `mail-verify-${randomUUID()}`;
    await prisma.webhookEvent.create({ data: { id, name: "mail.connection", status: "pending", payload: { connectorId: connector.id, connectorName: connector.name, actor } } });
    const result = await verifyMailConnector(connector);
    await prisma.webhookEvent.update({ where: { id }, data: { status: result.ok ? "verified" : "failed", payload: { connectorId: connector.id, connectorName: connector.name, actor, ...(result.reason ? { reason: result.reason } : {}) } } });
    return mailJson({ ...result, message: result.ok ? "Connexion authentifiee. Cette verification n'envoie aucun email et ne prouve pas la reception." : mailReasonMessage(result.reason || "transport_failed") });
  } catch (error) { return mailApiError(error); }
}
