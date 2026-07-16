import { NextRequest, NextResponse } from "next/server";
import { leadSchema } from "@/lib/validators/lead.schema";
import { prisma } from "@/lib/db/prisma";
import type { EstimateInput } from "@/lib/pricing/estimate-engine";
import { emitWebhook } from "@/lib/webhooks/emit-webhook";
import { sendTelegramLead } from "@/lib/webhooks/send-telegram-lead";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = leadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ ok: false, errors: parsed.error.flatten() }, { status: 400 });
  }

  const lead = parsed.data;
  const input = lead.input as EstimateInput;
  const projectDetails = JSON.parse(JSON.stringify(input));
  const estimateNumber = `A2E-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

  const savedLead = await prisma.lead.create({
    data: {
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      city: input.city,
      sourceLead: "website-simulator",
      typeProjet: input.projectType,
      budget: lead.result.mid,
      maturityScore: lead.result.maturityScore,
      consent: lead.consent,
      project: {
        create: {
          type: input.projectType,
          city: input.city,
          postalCode: input.postalCode,
          surface: input.surface,
          details: projectDetails
        }
      },
      estimates: {
        create: {
          number: estimateNumber,
          low: lead.result.low,
          mid: lead.result.mid,
          high: lead.result.high,
          duration: lead.result.duration,
          complexity: lead.result.complexity,
          assumptions: lead.result.assumptions ?? [],
          lines: {
            create: (lead.result.lines ?? []).map((line) => ({
              label: line.label,
              quantity: line.quantity,
              unit: line.unit,
              low: line.low,
              mid: line.mid,
              high: line.high
              ,reference: line.reference
              ,description: line.description
            }))
          }
        }
      }
    },
    include: {
      estimates: true
    }
  });

  await emitWebhook("lead.created", {
    leadId: savedLead.id,
    sourceLead: "website-simulator",
    typeProjet: input.projectType,
    ville: input.city,
    budget: lead.result.mid,
    statut: "nouveau"
  });

  await sendTelegramLead(lead, `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/admin?lead=${savedLead.id}`);

  await prisma.siteEvent.create({
    data: {
      event: "lead_submitted",
      path: "/simulateur",
      label: input.projectType,
      metadata: { leadId: savedLead.id, city: input.city, budget: lead.result.mid }
    }
  }).catch(() => undefined);

  return NextResponse.json({
    ok: true,
    status: savedLead.status,
    leadId: savedLead.id,
    estimateId: savedLead.estimates[0]?.id,
    estimateNumber
  });
}
