export type LeadNotificationInput = { name:string; email?:string; phone?:string; city?:string; number?:string; low:number; mid:number; high:number; pdf?:Uint8Array; event?:"leadCreated"|"pdfGenerated" };
export const escapeHtml = (value:string) => value.replace(/[&<>"']/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[char]!));
const euro=(value:number)=>value.toLocaleString("fr-FR")+" EUR";
export function notificationContent(input:LeadNotificationInput) {
 const title=input.event==="leadCreated"?"Nouvelle demande de projet":"Pre-devis PDF disponible";
 const e=(v:string|undefined)=>escapeHtml(v || "Non renseigne");
 return { subject:`A2E - ${title} - ${input.number ?? "Projet"}`, html:`<div style="font-family:Arial,sans-serif;color:#142e32;max-width:640px"><h2>${title}</h2><p><strong>Dossier :</strong> ${e(input.number)}</p><p><strong>Client :</strong> ${e(input.name)}<br><strong>Email :</strong> ${e(input.email)}<br><strong>Telephone :</strong> ${e(input.phone)}<br><strong>Ville :</strong> ${e(input.city)}</p><p><strong>Budget indicatif :</strong><br>${euro(input.low)} / ${euro(input.mid)} / ${euro(input.high)}</p><p>Montants a confirmer apres metre et visite technique. Aides non deduites. Consultez le dossier dans l'espace equipe et notez la prochaine action.</p></div>` };
}
