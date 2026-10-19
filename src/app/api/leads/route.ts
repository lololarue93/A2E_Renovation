import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { leadSchema } from "@/lib/validators/lead.schema";
import { prisma } from "@/lib/db/prisma";
import { estimateProject } from "@/lib/pricing/estimate-engine";
import { getPricingCatalog } from "@/lib/pricing/catalog";
import { emitWebhook } from "@/lib/webhooks/emit-webhook";
import { sendTelegramLead } from "@/lib/webhooks/send-telegram-lead";
import { sendLeadNotification } from "@/lib/email/send-lead-notification";
import { getNotificationSettings } from "@/lib/settings/notification-settings";
import { generateEstimatePdf } from "@/lib/pdf/generate-estimate-pdf";
import { isAnalyticsSessionId } from "@/lib/analytics-consent";
export const dynamic="force-dynamic";
export async function POST(request:NextRequest) {
 const raw=await request.text();
 if(raw.length>250000) return NextResponse.json({error:"Dossier trop volumineux."},{status:413});
 let body;try{body=JSON.parse(raw);}catch{return NextResponse.json({error:"Requete invalide."},{status:400});}
 const parsed=leadSchema.safeParse(body);
 if(!parsed.success) return NextResponse.json({error:"Verifiez les coordonnees, le code postal et les quantites.",errors:parsed.error.flatten()},{status:400});
 const lead=parsed.data;const input=lead.input;
 let catalog;
 try{catalog=await getPricingCatalog();}catch{return NextResponse.json({error:"Catalogue indisponible. Vos choix sont conserves ; contactez A2E."},{status:503});}
 let result;try{result=estimateProject(input,catalog);}catch{return NextResponse.json({error:"Un poste selectionne n'a pas de tarif actif. Contactez A2E pour le chiffrer."},{status:422});}
 if(result.lines.length===0 || !Number.isFinite(result.mid) || result.low<0 || result.low>result.mid || result.mid>result.high) return NextResponse.json({error:"Configuration de travaux invalide."},{status:400});
 const year=new Intl.DateTimeFormat("fr-FR",{year:"numeric",timeZone:"Europe/Paris"}).format(new Date());
 const number=`A2E-${year}-${randomUUID().slice(0,8).toUpperCase()}`;
 let saved;
 try {
  saved=await prisma.lead.create({data:{name:lead.name,phone:lead.phone,email:lead.email,city:input.city,sourceLead:"website-simulator",typeProjet:input.projectTypes?.join("+")||input.projectType,budget:result.mid,maturityScore:result.maturityScore,consent:true,...(lead.callbackRequested?{status:"a_rappeler"}:{}),
    project:{create:{type:input.projectType,city:input.city,postalCode:input.postalCode,surface:input.surface,details:JSON.parse(JSON.stringify({...input,message:lead.message||"",remarks:lead.remarks||"",callbackRequested:lead.callbackRequested===true,...(lead.callbackRequested?{callbackAvailability:lead.callbackAvailability||""}:{})}))}},
    estimates:{create:{number,low:result.low,mid:result.mid,high:result.high,duration:result.duration,complexity:result.complexity,assumptions:result.assumptions,lines:{create:result.lines.map(line=>({label:line.label,quantity:line.quantity,unit:line.unit,low:line.low,mid:line.mid,high:line.high,reference:line.reference,description:line.description}))}}}
  },include:{estimates:true}});
 }catch{return NextResponse.json({error:"Enregistrement temporairement indisponible. Vos choix restent dans le navigateur."},{status:503});}
 const estimateId=saved.estimates[0].id;
 const settings=await getNotificationSettings();
 await emitWebhook("lead.created",{leadId:saved.id,estimateId,typeProjet:saved.typeProjet}).catch(()=>undefined);
 if(settings.trackingEnabled && lead.analyticsConsent === true && isAnalyticsSessionId(lead.sessionId)) await prisma.siteEvent.create({data:{event:"lead_submitted",path:"/simulateur",label:"simulateur",sessionId:lead.sessionId}}).catch(()=>undefined);
 let pdf:Uint8Array|undefined;
 if(settings.events.leadCreated) {
  pdf=await generateEstimatePdf({name:lead.name,email:lead.email,phone:lead.phone,city:input.city,number,createdAt:saved.createdAt,...result,discountPercent:settings.signatureDiscountPercent,discountDays:settings.signatureWindowDays}).catch(()=>undefined);
 }
 const notifications=await Promise.allSettled([
  sendTelegramLead({...lead,result},`${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/admin?lead=${saved.id}`),
  sendLeadNotification({name:lead.name,email:lead.email,phone:lead.phone,city:input.city,number,low:result.low,mid:result.mid,high:result.high,pdf,event:"leadCreated",message:lead.message,remarks:lead.remarks,callbackRequested:lead.callbackRequested,callbackAvailability:lead.callbackAvailability},estimateId)
 ]);
 const emailOutcome=notifications[1].status==="fulfilled"?notifications[1].value:{sent:false};
 return NextResponse.json({ok:true,status:saved.status,leadId:saved.id,estimateId,estimateNumber:number,result,emailSent:emailOutcome.sent});
}
