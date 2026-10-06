import { NextRequest, NextResponse } from "next/server";
import { contactSchema } from "@/lib/validators/contact.schema";
import { prisma } from "@/lib/db/prisma";
import { sendContactNotification } from "@/lib/email/send-contact-notification";
import { getNotificationSettings } from "@/lib/settings/notification-settings";
import { emitWebhook } from "@/lib/webhooks/emit-webhook";

export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  const raw = await request.text();
  if (raw.length > 20000) return NextResponse.json({ error: "Le message est trop volumineux." }, { status: 413 });
  let body; try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: "Requete invalide." }, { status: 400 }); }
  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Verifiez vos coordonnees, votre message et l'accord pour etre recontacte." }, { status: 400 });
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: "Le formulaire est temporairement indisponible. Appelez A2E ou envoyez un email ; votre saisie est conservee." }, { status: 503 });
  const input = parsed.data;
  let lead;
  try {
    lead = await prisma.lead.create({ data: {
      name: input.name, phone: input.phone, email: input.email, city: input.city || null,
      consent: true, sourceLead: "website-contact", typeProjet: input.type,
      project: { create: { type: input.type, city: input.city || null, details: { message: input.message, origin: "contact-form" } } }
    } });
  } catch { return NextResponse.json({ error: "Votre demande n'a pas pu etre enregistree. Votre saisie est conservee ; reessayez ou contactez A2E directement." }, { status: 503 }); }
  const settings = await getNotificationSettings();
  if (settings.trackingEnabled) await prisma.siteEvent.create({ data: { event: "lead_submitted", path: "/contact", label: input.type, sessionId: input.sessionId, metadata: { leadId: lead.id } } }).catch(() => undefined);
  await emitWebhook("lead.created", { leadId: lead.id, sourceLead: "website-contact", typeProjet: input.type }).catch(() => undefined);
  await sendContactNotification({ leadId: lead.id, name: input.name, email: input.email, phone: input.phone, city: input.city, type: input.type, message: input.message }).catch(() => undefined);
  return NextResponse.json({ ok: true, leadId: lead.id }, { status: 201 });
}
