import assert from "node:assert/strict";
import { estimateProject } from "../src/lib/pricing/estimate-engine";
import { priceItems } from "../src/lib/pricing/price-data";
import { estimateInputSchema } from "../src/lib/validators/estimate.schema";
import { buildExpressProjectInput, canVisitStep, initialEstimate, quickBudgetFromSearch, restoreProjectDraft, selectedProjectTypes, toggleProjectType, updateProjectDomain, validateProjectFields } from "../src/components/calculators/estimator-flow";

const initial = initialEstimate();
assert.equal(initial.windowItems?.[0].quantity, 1);
assert.equal(validateProjectFields(initial), null);
const original = JSON.stringify(initial);
let project = toggleProjectType(initial, "insulation");
project = updateProjectDomain(project, "insulation", {surface:0.5});
project = toggleProjectType(project, "electricity");
project = updateProjectDomain(project, "electricity", {surface:37});
project = {...project, windowItems:[{...project.windowItems![0],quantity:4,material:"wood"}]};
const configured = JSON.stringify(project);
const total = estimateProject(project).mid;
assert.deepEqual(selectedProjectTypes(project), ["windows","insulation","electricity"]);
assert.equal(project.surfaces?.insulation,0.5);
assert.equal(project.surfaces?.electricity,37);
assert.equal(project.surface,80,"Une surface propre a un lot ne change pas celle des autres");
assert.equal(JSON.stringify(initial),original,"Les edits ne mutent pas l'input initial");
assert.ok(canVisitStep("selection","contact",true));
assert.ok(canVisitStep("details","contact",false),"Un retour reste possible avec une erreur");
assert.equal(canVisitStep("contact","selection",true),false);
assert.equal(canVisitStep("budget","contact",false),false);
assert.equal(JSON.stringify(project),configured,"La navigation ne modifie pas les donnees");
const restored = restoreProjectDraft(JSON.stringify(project));
assert.ok(restored);
assert.deepEqual(restored,estimateInputSchema.parse(project));
assert.equal(estimateProject(restored).mid,total,"Le brouillon conserve toutes les quantites et le total");
const invalid = {...project,windowItems:[{...project.windowItems![0],quantity:0}]};
assert.equal(validateProjectFields(invalid)?.type,"windows");
assert.match(validateProjectFields(invalid)?.message??"",/1 000/);
assert.equal(restoreProjectDraft("{bad"),null);
assert.equal(restoreProjectDraft(JSON.stringify(invalid)),null);
assert.equal(toggleProjectType(initial,"windows").projectTypes?.length,1,"Le dernier lot ne laisse pas un projet vide");
const withoutFacade=toggleProjectType(project,"insulation");
assert.equal(withoutFacade.surfaces?.insulation,.5,"Retirer un lot preserve ses reglages pour le rajouter");
assert.equal(estimateProject(toggleProjectType(withoutFacade,"insulation")).mid,total);
for(const lot of ["windows","insulation","electricity","plumbing","hvac","global"] as const) {
 const quantity=lot==="insulation"?.5:4;
 const parsed=quickBudgetFromSearch(new URLSearchParams({lot,quantite:String(quantity)}));
 assert.deepEqual(parsed,buildExpressProjectInput(lot,quantity));
 assert.ok(parsed);
 const result=estimateProject(parsed,priceItems);
 assert.ok(result.mid>0);
 if(lot==="electricity") {assert.equal(parsed.electricalItems?.[0].quantity,4);assert.equal(result.lines.length,1);assert.equal(parsed.electricalMode,"items");}
 if(lot==="plumbing") {assert.equal(parsed.plumbingFixtures?.[0].kind,"water_point");assert.equal(result.lines.length,1,"Aucune distribution implicite");}
 if(lot==="hvac") {assert.equal(parsed.hvacType,"pac_air_water");assert.equal(result.lines[0].quantity,1,"La PAC reste un forfait");}
}
for(const query of ["lot=wat&quantite=4","lot=windows&quantite=0","lot=electricity&quantite=2.5","lot=plumbing&quantite=1001","lot=windows&quantite=NaN","lot=global&quantite=100001","lot=insulation&quantite=-1","lot=global&quantite=4&lot=windows"]) {
 const params=new URLSearchParams(query);
 if(params.getAll("lot").length>1) continue;
 assert.equal(quickBudgetFromSearch(params),null,query);
}
console.log("PASS : parcours 4 etapes, retour sans perte, surfaces independantes, validation, brouillon et import Express coherents.");
