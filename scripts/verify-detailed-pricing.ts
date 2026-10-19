import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { PDFDocument } from "pdf-lib";
import { estimateProject, type EstimateInput } from "../src/lib/pricing/estimate-engine";
import { priceItems } from "../src/lib/pricing/price-data";
import { estimateInputSchema } from "../src/lib/validators/estimate.schema";
import { exportCatalogCsv, parseCatalogCsv, validatePriceItem } from "../src/lib/pricing/catalog-transfer";
import { generateEstimatePdf } from "../src/lib/pdf/generate-estimate-pdf";
import { buildExpressProjectInput, restoreProjectDraft } from "../src/components/calculators/estimator-flow";

async function main() {
 const find=(key:string)=>{const item=priceItems.find(item=>item.key===key);assert.ok(item,key);return item;};
 const electric=buildExpressProjectInput("electricity",4);
 const before=JSON.stringify(electric),catalogBefore=JSON.stringify(priceItems);
 const sockets=estimateProject(electric);
 assert.equal(sockets.lines.length,1,"A la carte : ni m2 ni tableau automatique");
 assert.equal(sockets.mid,find("electric_socket_new").mid*4);
 assert.equal(estimateProject({...electric,surface:100000,surfaces:{electricity:.5}}).mid,sockets.mid,"La surface n'altere pas des prises comptees");
 const panel=estimateProject({...electric,electricalItems:[],electricalPanel:"2r8c"});
 assert.equal(panel.lines.length,2);
 assert.equal(panel.mid,find("electric_panel_2r8c_supply").mid+find("electric_panel_install").mid);
 assert.match(panel.lines[0].label,/8 circuits/);assert.equal(panel.lines[0].unit,"unit");
 const packInput:EstimateInput={...electric,electricalMode:"pack",electricalPack:"room",electricalItems:[{kind:"socket",quantity:999}],includePanel:true};
 const pack=estimateProject(packInput);
 assert.deepEqual(pack.lines.map(line=>line.quantity),[4,1,1],"Le pack ne cumule pas les details conserves");
 assert.equal(pack.lines.length,3,"L'ancien includePanel ne cree pas de tableau dans un nouveau mode");
 assert.equal(pack.mid,find("electric_socket_new").mid*4+find("electric_light_point").mid+find("electric_dedicated_circuit").mid);
 assert.deepEqual(estimateProject({...packInput,electricalPack:"apartment"}).lines.map(line=>line.quantity),[12,5,3]);
 const changed=priceItems.map(item=>item.key==="electric_socket_new"?{...item,low:90,mid:125.5,high:170}:item);
 assert.equal(estimateProject(electric,changed).mid,502,"Le prix admin au centime est pris en compte");
 assert.throws(()=>estimateProject(electric,priceItems.filter(item=>item.key!=="electric_socket_new")),/Tarif indisponible/);
 const water=buildExpressProjectInput("plumbing",2);
 assert.equal(estimateProject(water).lines.length,1);assert.equal(estimateProject(water).mid,find("plumbing_water_point_v2").mid*2);
 const wc=estimateProject({...water,plumbingFixtures:[{kind:"wc",quantity:2}]});
 assert.equal(wc.lines.length,2);assert.deepEqual(wc.lines.map(line=>line.quantity),[2,2]);
 assert.equal(wc.mid,(find("plumbing_wc_supply").mid+find("plumbing_wc_install").mid)*2);
 const sanitary=estimateProject({...water,plumbingMode:"bathroom_pack",plumbingFixtures:[{kind:"water_point",quantity:999}]});
 assert.equal(sanitary.lines.length,6);assert.ok(sanitary.lines.every(line=>line.quantity===1));
 const bathroom:EstimateInput={...water,projectType:"kitchen_bath",projectTypes:["kitchen_bath"],roomType:"bathroom",bathroomMode:"standard_pack",bathroomFloorArea:4.5,bathroomWallArea:12};
 const result=estimateProject(estimateInputSchema.parse(bathroom));
 assert.equal(result.lines.length,8);assert.deepEqual(result.lines.slice(-2).map(line=>line.quantity),[4.5,12]);
 assert.equal(estimateProject({...bathroom,surface:100000}).mid,result.mid,"Pas de forfait sdb m2 cache");
 const finishes=estimateProject({...bathroom,bathroomMode:"finishes",projectTypes:["kitchen_bath","plumbing"],plumbingFixtures:[{kind:"basin",quantity:1}]});
 assert.equal(finishes.lines.length,4,"Finitions et plomberie distinctes peuvent se combiner");
 for(const invalid of [
  {...electric,electricalItems:[],electricalPanel:"none"},
  {...water,includePlumbingDistribution:true},
  {...water,plumbingFixtures:[],includePlumbingDistribution:true,customItems:[{key:"plumbing_water_point_v2",quantity:1}]},
  {...water,plumbingMode:"bathroom_pack",includePlumbingDistribution:true,customItems:[{key:"plumbing_water_point_v2",quantity:1}]},
  {...bathroom,projectTypes:["kitchen_bath","plumbing"]},
  {...bathroom,bathroomMode:"finishes",bathroomFloorArea:undefined,bathroomWallArea:undefined},
  {...packInput,customItems:[{key:"electric_point",quantity:1}]},
  {...packInput,customItems:[{key:"electric_socket_new",quantity:1}]},
  {...packInput,customItems:[{key:"electric_panel",quantity:1}]},
  {...bathroom,customItems:[{key:"plumbing_wc",quantity:1}]}
 ]) {assert.equal(estimateInputSchema.safeParse(invalid).success,false,"Un chevauchement ou panier vide est refuse au serveur");assert.throws(()=>estimateProject(invalid as EstimateInput));}
 const legacy:EstimateInput={...electric,electricalMode:undefined,electricalItems:[{kind:"socket",quantity:2}],includePanel:true,electricalScope:"partial",surface:25,surfaces:undefined};
 assert.equal(estimateInputSchema.safeParse({...electric,projectType:"windows",projectTypes:["windows"],electricalMode:undefined,electricalItems:[],plumbingMode:undefined,plumbingFixtures:[]}).success,true,"Des lignes inactives vides ne bloquent pas le projet");
 assert.equal(estimateInputSchema.safeParse({...electric,projectType:"windows",projectTypes:["windows"],plumbingMode:"items",includePlumbingDistribution:true,customItems:[{key:"plumbing_water_point_v2",quantity:1}]}).success,true,"Une distribution inactive ne bloque pas un point seul explicite");
 assert.equal(estimateInputSchema.safeParse({...electric,projectType:"windows",projectTypes:["windows"],bathroomMode:"finishes",bathroomFloorArea:4,customItems:[{key:"bathroom_floor_finish",quantity:1}]}).success,true,"Une ancienne surface de piece inactive ne bloque pas une option seule");
 const kitchen:EstimateInput={...bathroom,roomType:"kitchen",surfaces:undefined,surface:80};
 assert.equal(estimateInputSchema.safeParse(kitchen).success,false,"Une cuisine n'herite pas des 80 m2 du logement");
 assert.throws(()=>estimateProject(kitchen),/surface réelle de la cuisine/);
 assert.equal(estimateProject({...kitchen,surfaces:{kitchen_bath:8}}).mid,Math.round(find("kitchen").mid*8));
 const legacyKitchen:EstimateInput={...kitchen,bathroomMode:undefined,surface:12,surfaces:undefined};
 assert.equal(estimateInputSchema.safeParse(legacyKitchen).success,true,"Un vieux brouillon cuisine sans mode conserve sa surface historique");
 assert.ok(restoreProjectDraft(JSON.stringify(legacyKitchen)),"Le brouillon cuisine historique peut etre restaure");
 assert.equal(estimateProject(legacyKitchen).mid,Math.round(find("kitchen").mid*12));
 assert.equal(estimateProject(legacy).mid,Math.round(find("electric_partial").mid*25)+find("electric_panel").mid+find("electric_point").mid*2,"Un vieux dossier conserve son calcul au catalogue courant");
 for(const sample of [sockets,panel,pack,wc,sanitary,result,finishes,estimateProject({...bathroom,access:"difficult",urgency:"fast"})]) for(const scenario of ["low","mid","high"] as const) assert.equal(sample[scenario],sample.lines.reduce((sum,line)=>sum+line[scenario],0));
 assert.equal(JSON.stringify(electric),before);assert.equal(JSON.stringify(priceItems),catalogBefore);
 const canonical=priceItems.map(validatePriceItem);assert.deepEqual(parseCatalogCsv(exportCatalogCsv(priceItems)),canonical);
 assert.equal(new Set(priceItems.map(item=>item.key)).size,priceItems.length);
 const databaseUrl=process.env.DATABASE_URL;delete process.env.DATABASE_URL;
 try {
  const fixture={name:"Validation locale · sanitaires et finitions",number:"A2E-TEST-DETAILLE",city:"Saint-Denis",...result,discountPercent:5,discountDays:14};
  const pdf=await generateEstimatePdf(fixture);assert.ok(pdf.byteLength>1000);assert.ok((await PDFDocument.load(pdf)).getPageCount()>=1);
  const folder=resolve("docs/preview-tests");await mkdir(folder,{recursive:true});await writeFile(resolve(folder,"estimate-detailed.pdf"),pdf);await writeFile(resolve(folder,"estimate-detailed.json"),JSON.stringify(fixture,null,2));
 } finally {if(databaseUrl===undefined)delete process.env.DATABASE_URL;else process.env.DATABASE_URL=databaseUrl;}
 console.log("PASS : prix a la carte, packs quantifies, tableau compose, sanitaires fourniture/pose, surfaces reelles, anti-doublons, heritage, CSV et fixture PDF local.");
}
main().catch(error=>{console.error(error);process.exitCode=1;});
