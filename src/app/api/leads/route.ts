import { NextRequest, NextResponse } from "next/server";
import { leadSchema } from "@/lib/validators/lead.schema";
import { prisma } from "@/lib/db/prisma";
import { estimateProject, type EstimateInput } from "@/lib/pricing/estimate-engine";
import { emitWebhook } from "@/lib/webhooks/emit-webhook";
import { sendTelegramLead } from "@/lib/webhooks/send-telegram-lead";

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 250_000) return NextResponse.json({ ok: false, error: "Dossier trop volumineux" }, { status: 413 });
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, error: "Requête invalide" }, { status: 400 });
  const parsed = leadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ ok: false, errors: parsed.error.flatten() }, { status: 400 });
  }

  const lead = parsed.data;
  const input = lead.input as EstimateInput;
  if (!input.projectType) return NextResponse.json({ ok: false, error: "Poste de travaux manquant" }, { status: 400 });
  let serverResult;
  try {
    serverResult = estimateProject(input);
  } catch {
    return NextResponse.json({ ok: false, error: "Configuration de travaux invalide" }, { status: 400 });
  }
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
      budget: serverResult.mid,
      maturityScore: serverResult.maturityScore,
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
          low: serverResult.low,
          mid: serverResult.mid,
          high: serverResult.high,
          duration: serverResult.duration,
          complexity: serverResult.complexity,
          assumptions: serverResult.assumptions ?? [],
          lines: {
            create: (serverResult.lines ?? []).map((line) => ({
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
    budget: serverResult.mid,
    statut: "nouveau"
  });

  await sendTelegramLead({ ...lead, result: serverResult }, `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/admin?lead=${savedLead.id}`);

  await prisma.siteEvent.create({
    data: {
      event: "lead_submitted",
      path: "/simulateur",
      label: input.projectType,
      metadata: { leadId: savedLead.id, city: input.city, budget: serverResult.mid }
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
