import { z } from "zod";
import { validateDetailedScope } from "../pricing/estimate-engine";
const type = z.enum(["windows","insulation","electricity","plumbing","global","hvac","kitchen_bath","roofing","other"]);
const amount = z.number().finite().positive().max(100000);
const quantity = z.number().int().positive().max(1000);
export const estimateInputSchema = z.object({
 projectType: type, projectTypes: z.array(type).min(1).max(9).optional(),
 city: z.string().max(120).optional(), postalCode: z.string().regex(/^$|^\d{5}$/).optional(),
 surface: amount.optional(), surfaces: z.record(type, amount).optional(), quantity: quantity.optional(),
 material: z.enum(["pvc","alu","wood","mixed"]).optional(), roomType: z.enum(["kitchen","bathroom"]).optional(),
 finish: z.enum(["economy","standard","premium"]).default("standard"), urgency: z.enum(["info","normal","fast","urgent"]).default("normal"), access: z.enum(["simple","medium","difficult"]).default("simple"),
 windowWidth: amount.optional(), windowHeight: amount.optional(),
 opening: z.enum(["fixed","french","oscillo","sliding"]).optional(), installPack: z.enum(["renovation","total"]).optional(),
 windowItems: z.array(z.object({kind:z.enum(["window","door_window","entry_door","bay"]),quantity,material:z.enum(["pvc","alu","wood"]),width:z.number().finite().min(30).max(1000),height:z.number().finite().min(30).max(1000),opening:z.enum(["fixed","french","oscillo","sliding"]),installPack:z.enum(["renovation","total"]),shutter:z.boolean()})).min(1).max(100).optional(),
 electricalItems:z.array(z.object({kind:z.enum(["socket","socket_replace","lighting","luminaire","cooktop","ev","network"]),quantity})).max(100).optional(),
 plumbingFixtures:z.array(z.object({kind:z.enum(["shower","bath","basin","wc","sink","water_point","removal"]),quantity})).max(100).optional(),
 electricalMode:z.enum(["items","pack","legacy"]).optional(),electricalPack:z.enum(["room","apartment"]).optional(),electricalPanel:z.enum(["none","1r4c","2r8c","3r12c"]).optional(),
 plumbingMode:z.enum(["items","bathroom_pack","legacy"]).optional(),includePlumbingDistribution:z.boolean().optional(),
 bathroomMode:z.enum(["finishes","standard_pack","legacy"]).optional(),bathroomFloorArea:amount.optional(),bathroomWallArea:amount.optional(),
 insulationFinish:z.enum(["render","cladding","unknown"]).optional(), insulationMaterial:z.enum(["pse","graphite","rockwool","wood"]).optional(), includeScaffold:z.boolean().optional(), insulationThickness:amount.optional(),globalLevel:z.enum(["light","medium","full"]).optional(),electricalScope:z.enum(["partial","full"]).optional(),
 includePanel:z.boolean().optional(), includeWaterHeaterConnection:z.boolean().optional(), hvacType:z.enum(["pac","pac_air_water","pac_air_air","pac_air_water_large","vmc_simple","vmc_hygro","vmc_double","water_heater"]).optional(),
 shutters:z.boolean().optional(),acoustic:z.boolean().optional(),
 energy:z.object({annualConsumption:z.number().finite().min(0).max(1000000).optional(),annualEnergyCost:z.number().finite().min(0).max(100000).optional(),energyType:z.enum(["electricity","gas","fuel","other"]).optional(),household:quantity.optional(),homeYear:z.enum(["before_1975","1975_2000","2000_2012","after_2012"]).optional(),currentDpe:z.enum(["A_B","C_D","E","F_G","unknown"]).optional(),insulation:z.enum(["good","partial","none","unknown"]).optional(),solar:z.boolean().optional(),solarKw:amount.optional(),selfConsumption:z.boolean().optional()}).optional(),
 customItems:z.array(z.object({key:z.string().min(1).max(100),quantity:amount})).max(100).optional()
}).superRefine((input, context) => {
 const issue=(path:string,message:string)=>context.addIssue({code:z.ZodIssueCode.custom,path:[path],message});
 const types=new Set(input.projectTypes?.length?input.projectTypes:[input.projectType]);
 const scope=validateDetailedScope(input);if(scope)issue(scope.field,scope.message);
 if(types.has("electricity") && (input.electricalMode===undefined||input.electricalMode==="legacy") && input.electricalItems?.length===0) issue("electricalItems","Ajoutez un point ou choisissez le mode à la carte.");
 if(types.has("plumbing") && (input.plumbingMode===undefined||input.plumbingMode==="legacy") && input.plumbingFixtures?.length===0) issue("plumbingFixtures","Ajoutez un sanitaire ou choisissez le mode à la carte.");
});
