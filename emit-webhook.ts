import type { Prisma } from "@prisma/client";

export type WebhookEventName = "lead.created" | "estimate.created" | "estimate.pdf_generated" | "lead.status_changed";

export async function emitWebhook(eventName: WebhookEventName, payload: unknown) {
  const { prisma } = await import("@/lib/db/prisma");

  await prisma.webhookEvent.create({
    data: {
      name: eventName,
      payload: payload as Prisma.InputJsonValue,
      status: "logged"
    }
  });

  console.info(`[webhook:${eventName}]`, JSON.stringify(payload).slice(0, 400));
}
