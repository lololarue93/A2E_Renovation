import { NextRequest, NextResponse } from "next/server";
import { generateEstimatePdf } from "@/lib/pdf/generate-estimate-pdf";
import { emitWebhook } from "@/lib/webhooks/emit-webhook";
import { prisma } from "@/lib/db/prisma";
import { sendLeadNotification } from "@/lib/email/send-lead-notification";
import { getNotificationSettings } from "@/lib/settings/notification-settings";
export const dynamic="force-dynamic";
export async function GET(request:NextRequest) {
 const estimateId=request.nextUrl.searchParams.get("estimateId");
 if(!estimateId || !/^[a-zA-Z0-9_-]{10,100}$/.test(estimateId)) return NextResponse.json({error:"Reference de dossier requise."},{status:400});
 try {
  const stored=await prisma.estimate.findUnique({where:{id:estimateId},include:{lead:{include:{project:{select:{details:true}}}},lines:true}});
  if(!stored) return NextResponse.json({error:"Dossier introuvable."},{status:404});
  const settings=await getNotificationSettings();
  const input={name:stored.lead?.name ?? "Client",email:stored.lead?.email,phone:stored.lead?.phone,city:stored.lead?.city ?? undefined,number:stored.number,createdAt:stored.createdAt,low:stored.low,mid:stored.mid,high:stored.high,duration:stored.duration,complexity:stored.complexity,assumptions:Array.isArray(stored.assumptions)?stored.assumptions as string[]:[],lines:stored.lines,discountPercent:settings.signatureDiscountPercent,discountDays:settings.signatureWindowDays};
  const pdf=await generateEstimatePdf(input);
  await emitWebhook("estimate.pdf_generated",{estimateId}).catch(()=>undefined);
  const details=stored.lead?.project?.details;
  const requestDetails=details && typeof details==="object" && !Array.isArray(details)?{
   ...(typeof details.message==="string"?{message:details.message}:{}),
   ...(typeof details.remarks==="string"?{remarks:details.remarks}:{}),
   callbackRequested:details.callbackRequested===true,
   ...(details.callbackRequested===true && typeof details.callbackAvailability==="string"?{callbackAvailability:details.callbackAvailability}:{})
  }:{};
  await sendLeadNotification({...input,...requestDetails,pdf,event:"pdfGenerated"},estimateId).catch(()=>undefined);
  return new Response(new Uint8Array(pdf),{headers:{"content-type":"application/pdf","content-disposition":`attachment; filename="pre-devis-${stored.number}.pdf"`,"cache-control":"private, no-store","x-robots-tag":"noindex, nofollow"}});
 }catch { return NextResponse.json({error:"PDF temporairement indisponible. Votre dossier reste conserve."},{status:503}); }
}
