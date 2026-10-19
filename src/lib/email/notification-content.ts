export type ProjectRequestDetails = { message?:string; remarks?:string; callbackRequested?:boolean; callbackAvailability?:string };
export type LeadNotificationInput = ProjectRequestDetails & { name:string; email?:string; phone?:string; city?:string; number?:string; low:number; mid:number; high:number; pdf?:Uint8Array; event?:"leadCreated"|"pdfGenerated" };
export const escapeHtml = (value:string) => value.replace(/[&<>"']/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[char]!));
const euro=(value:number)=>value.toLocaleString("fr-FR")+" EUR";
export function projectRequestContent(input:ProjectRequestDetails) {
 const sections: Array<[string,string]> = [];
 if(input.message) sections.push(["Description du projet",input.message]);
 if(input.remarks) sections.push(["Remarques et contraintes",input.remarks]);
 if(input.callbackRequested) {
  sections.push(["Rappel demande","Oui - disponibilites souhaitees, a confirmer avec le client."]);
  if(input.callbackAvailability) sections.push(["Disponibilites souhaitees",input.callbackAvailability]);
 }
 return {
  text:sections.map(([label,value])=>`${label} :\n${value}`).join("\n\n"),
  html:sections.map(([label,value])=>`<p><strong>${escapeHtml(label)} :</strong><br>${escapeHtml(value).replace(/\n/g,"<br>")}</p>`).join("")
 };
}
export function notificationContent(input:LeadNotificationInput) {
 const title=input.event==="leadCreated"?"Nouvelle demande de projet":"Pre-devis PDF disponible";
 const e=(v:string|undefined)=>escapeHtml(v || "Non renseigne");
 const details=projectRequestContent(input);
 return { subject:`A2E - ${title} - ${input.number ?? "Projet"}`, text:[title,`Dossier : ${input.number || "A2E"}`,`Nom : ${input.name}`,`Email : ${input.email || "Non renseigne"}`,`Telephone : ${input.phone || "Non renseigne"}`,`Ville : ${input.city || "Non renseignee"}`,`Fourchette indicative : ${input.low} a ${input.high} EUR`,details.text,"Montants a confirmer apres metre et visite technique. Aides non deduites. Retrouvez le dossier dans l'espace equipe."].filter(Boolean).join("\n"), html:`<div style="font-family:Arial,sans-serif;color:#142e32;max-width:640px"><h2>${title}</h2><p><strong>Dossier :</strong> ${e(input.number)}</p><p><strong>Client :</strong> ${e(input.name)}<br><strong>Email :</strong> ${e(input.email)}<br><strong>Telephone :</strong> ${e(input.phone)}<br><strong>Ville :</strong> ${e(input.city)}</p><p><strong>Budget indicatif :</strong><br>${euro(input.low)} / ${euro(input.mid)} / ${euro(input.high)}</p>${details.html}<p>Montants a confirmer apres metre et visite technique. Aides non deduites. Consultez le dossier dans l'espace equipe et notez la prochaine action.</p></div>` };
}
