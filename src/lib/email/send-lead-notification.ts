import { getNotificationSettings } from "@/lib/settings/notification-settings";
import { notificationContent, type LeadNotificationInput } from "./notification-content";
import { prisma } from "@/lib/db/prisma";
import nodemailer from "nodemailer";

export function validateRecipients(emails: string[]) {
 return Array.from(new Set(emails.map(email=>email.trim()).filter(email=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))));
}

export async function deliverNotificationEmail(input:{recipients:string[];subject:string;html:string;text:string;replyTo?:string;attachment?:{filename:string;content:Uint8Array}}):Promise<{ok:boolean;reason?:string}> {
 const settings=await getNotificationSettings(); const recipients=validateRecipients(input.recipients);
 if (!recipients.length) return {ok:false,reason:"no_recipients"};
 try {
  if(settings.provider==="brevo") {
   const apiKey=process.env.BREVO_API_KEY;const sender=process.env.BREVO_SENDER_EMAIL;
   if(!apiKey||!sender)throw new Error("brevo_not_configured");
   const response=await fetch("https://api.brevo.com/v3/smtp/email",{method:"POST",signal:AbortSignal.timeout(10000),headers:{"api-key":apiKey,"content-type":"application/json",accept:"application/json"},body:JSON.stringify({sender:{name:process.env.BREVO_SENDER_NAME??"A2E Renovation",email:sender},to:recipients.map(email=>({email})),replyTo:input.replyTo?{email:input.replyTo}:undefined,subject:input.subject,htmlContent:input.html,textContent:input.text,attachment:input.attachment?[{content:Buffer.from(input.attachment.content).toString("base64"),name:input.attachment.filename}]:undefined})});
   if(!response.ok)throw new Error("provider_http_"+response.status);
  } else {
   const user=process.env.SMTP_USER;const pass=process.env.SMTP_PASSWORD;
   if(!user||!pass)throw new Error("smtp_not_configured");
   const host=process.env.SMTP_HOST||(settings.provider==="gmail"?"smtp.gmail.com":"ssl0.ovh.net");const port=Number(process.env.SMTP_PORT||465);
   const transport=nodemailer.createTransport({host,port,secure:process.env.SMTP_SECURE?process.env.SMTP_SECURE==="true":port===465,auth:{user,pass},connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000});
   try{await transport.sendMail({from:process.env.BREVO_SENDER_EMAIL||user,to:recipients.join(","),replyTo:input.replyTo,subject:input.subject,html:input.html,text:input.text,attachments:input.attachment?[{filename:input.attachment.filename,content:Buffer.from(input.attachment.content)}]:undefined});}
   finally{transport.close();}
  }
  return {ok:true};
 } catch(error){
  const reason=error instanceof Error&&/^(brevo_not_configured|smtp_not_configured|provider_http_\d+)$/.test(error.message)?error.message:"transport_failed";
  return {ok:false,reason};
 }
}

/** One recorded attempt per event and estimate; failures remain inspectable in admin. */
export async function sendLeadNotification(input:LeadNotificationInput,estimateId?:string){
 const settings=await getNotificationSettings();const event=input.event??"pdfGenerated";
 if(!settings.events[event])return{sent:false,reason:"event_disabled"};
 const recipients=validateRecipients(settings.recipients);
 if(!recipients.length)return{sent:false,reason:"no_recipients"};
 const ledgerId=estimateId?"notification-"+event+"-"+estimateId:undefined;
 if(ledgerId){
  try{await prisma.webhookEvent.create({data:{id:ledgerId,name:"notification."+event,payload:{estimateId,recipientCount:recipients.length},status:"pending"}});}
  catch{return{sent:false,reason:"already_attempted_or_log_unavailable"};}
 }
 const content=notificationContent(input);
 const result=await deliverNotificationEmail({recipients,...content,text:["Dossier "+(input.number??"A2E"),input.name,input.email??"",input.phone??"","Fourchette indicative : "+input.low+" a "+input.high+" EUR"].join("\n"),replyTo:input.email,attachment:input.pdf?{filename:"pre-devis-"+(input.number??"a2e")+".pdf",content:input.pdf}:undefined});
 if(ledgerId)await prisma.webhookEvent.update({where:{id:ledgerId},data:{status:result.ok?"sent":"failed",payload:{estimateId,recipientCount:recipients.length,...(result.reason?{reason:result.reason}:{})}}}).catch(()=>undefined);
 return {sent:result.ok,reason:result.reason};
}
