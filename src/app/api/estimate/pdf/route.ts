import { NextRequest } from "next/server";
import { generateEstimatePdf } from "@/lib/pdf/generate-estimate-pdf";
import { emitWebhook } from "@/lib/webhooks/emit-webhook";
import { prisma } from "@/lib/db/prisma";
import { sendLeadNotification } from "@/lib/email/send-lead-notification";

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams;
  const estimateId = search.get("estimateId");
  const stored = estimateId ? await prisma.estimate.findUnique({ where: { id: estimateId }, include: { lead: true, lines: true } }).catch(() => null) : null;
  const name = stored?.lead?.name ?? search.get("name") ?? "Client";
  const low = stored?.low ?? Number(search.get("low") ?? "0");
  const mid = stored?.mid ?? Number(search.get("mid") ?? "0");
  const high = stored?.high ?? Number(search.get("high") ?? "0");
  const pdf = await generateEstimatePdf({ name, email: stored?.lead?.email, phone: stored?.lead?.phone, city: stored?.lead?.city ?? undefined, number: stored?.number, createdAt: stored?.createdAt, low, mid, high, duration: stored?.duration, complexity: stored?.complexity, assumptions: Array.isArray(stored?.assumptions) ? stored?.assumptions as string[] : [], lines: stored?.lines });
  await emitWebhook("estimate.pdf_generated", { estimateId, name, low, mid, high }).catch(() => undefined);
  const body = new ArrayBuffer(pdf.byteLength);
  new Uint8Array(body).set(pdf);

  await sendLeadNotification({
    name,
    email: stored?.lead?.email,
    phone: stored?.lead?.phone,
    city: stored?.lead?.city ?? undefined,
    number: stored?.number,
    low,
    mid,
    high,
    pdf
  }).catch(() => undefined);

  return new Response(body, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="pre-devis-a2e-renovation-detaille.pdf"`
    }
  });
}
