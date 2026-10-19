import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { parisDayKey, parisMidnight } from "./dashboard-metrics";

export const crmActivityKinds = ["note", "call", "email", "visit"] as const;
export const crmActivityLabels = { note: "Note interne", call: "Appel déclaré", email: "Email déclaré", visit: "Visite déclarée" };
export const manualLeadSources = ["manual", "telephone", "recommandation", "reseau", "salon", "partenaire"] as const;
export const crmSourceLabels: Record<string, string> = { "website": "Site web", "website-simulator": "Simulateur", "website-contact": "Formulaire de contact", manual: "Saisie manuelle", telephone: "Téléphone", recommandation: "Recommandation", reseau: "Réseau", salon: "Salon / événement", partenaire: "Partenaire" };
export const crmDueFilters = ["overdue", "today", "upcoming", "unscheduled"] as const;
export type CrmDueFilter = typeof crmDueFilters[number];
export const crmActiveStatuses = ["nouveau", "a_rappeler", "visite_a_planifier", "devis_a_preparer", "devis_envoye"] as const;
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => value >= "2000-01-01" && value <= "2100-12-31" && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value, "Date invalide.");
export const crmDateSchema = dateSchema;
const contactFields = z.object({
  name: z.string().trim().max(160), company: z.string().trim().max(160).default(""),
  email: z.union([z.string().trim().toLowerCase().email().max(160), z.literal("")]),
  phone: z.string().trim().max(40).refine(value => !value || /^[+\d\s().-]{6,40}$/.test(value), "Téléphone invalide."),
  city: z.string().trim().max(120), typeProjet: z.string().trim().min(2).max(160),
  sourceLead: z.string().trim().min(1).max(80), budget: z.number().int().min(0).max(100_000_000).nullable(), consent: z.boolean()
}).strict();
function validateContact(value: z.infer<typeof contactFields>, context: z.RefinementCtx) {
  if (value.name.length < 2 && value.company.length < 2) context.addIssue({ code: "custom", path: ["name"], message: "Renseignez un nom ou une entreprise." });
  if (!value.email && !value.phone) context.addIssue({ code: "custom", path: ["email"], message: "Renseignez un email ou un téléphone." });
}
export const crmEditableContactSchema = contactFields.superRefine(validateContact);
export const crmContactSchema = contactFields.extend({ sourceLead: z.enum(manualLeadSources) }).superRefine(validateContact);
export function crmDueWindow(now = new Date()) {
  const key = parisDayKey(now);
  const tomorrow = new Date(`${key}T12:00:00Z`); tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  return { start: parisMidnight(key), end: parisMidnight(tomorrow.toISOString().slice(0, 10)) };
}
export function crmDueWhere(filter: CrmDueFilter, now = new Date()): Prisma.LeadWhereInput {
  const { start, end } = crmDueWindow(now);
  return { status: { in: [...crmActiveStatuses] }, ...(filter === "unscheduled" ? { nextActionAt: null } : { nextActionAt: filter === "overdue" ? { lt: start } : filter === "today" ? { gte: start, lt: end } : { gte: end } }) };
}
export function crmNextActionDate(value: string) { return parisMidnight(crmDateSchema.parse(value)); }
export function crmDueLabel(value: string | null, status: string, now = new Date()): string {
  if (!crmActiveStatuses.includes(status as typeof crmActiveStatuses[number])) return "Dossier clôturé";
  if (!value) return "Prochaine action à définir";
  const timestamp = new Date(value).getTime(); if (!Number.isFinite(timestamp)) return "Date à vérifier";
  const { start, end } = crmDueWindow(now);
  return timestamp < start.getTime() ? "En retard" : timestamp < end.getTime() ? "Aujourd’hui" : "À venir";
}
