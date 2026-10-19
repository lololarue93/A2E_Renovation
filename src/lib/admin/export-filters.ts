import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { leadStatuses } from "./lead-status";
import { parisMidnight } from "./dashboard-metrics";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value && parsed.getUTCFullYear() >= 1900 && parsed.getUTCFullYear() <= 2100;
}, "Date invalide.");
const querySchema = z.object({
  consent: z.enum(["true", "false"]).default("true"),
  status: z.enum(leadStatuses).optional(),
  type: z.enum(["windows", "insulation", "electricity", "plumbing", "global", "hvac", "kitchen_bath", "roofing", "other"]).optional(),
  from: date.optional(), to: date.optional()
}).refine((value) => !value.from || !value.to || value.from <= value.to, "La date de debut doit preceder la date de fin.");

export function exportLeadFilters(search: URLSearchParams) {
  const parsed = querySchema.safeParse(Object.fromEntries(["consent", "status", "type", "from", "to"].flatMap((key) => search.get(key) ? [[key, search.get(key)!]] : [])));
  if (!parsed.success) return { ok: false as const, error: "Filtres invalides. Verifiez le statut, le metier, le consentement et les dates (AAAA-MM-JJ, debut avant fin)." };
  const filter = parsed.data;
  let end: Date | undefined;
  if (filter.to) { const next = new Date(`${filter.to}T12:00:00Z`); next.setUTCDate(next.getUTCDate() + 1); end = parisMidnight(next.toISOString().slice(0, 10)); }
  const where: Prisma.LeadWhereInput = {
    consent: filter.consent === "true", ...(filter.status ? { status: filter.status } : {}),
    ...(filter.type ? { OR: [{ typeProjet: filter.type }, { typeProjet: { startsWith: `${filter.type}+` } }, { typeProjet: { endsWith: `+${filter.type}` } }, { typeProjet: { contains: `+${filter.type}+` } }] } : {}),
    ...(filter.from || end ? { createdAt: { ...(filter.from ? { gte: parisMidnight(filter.from) } : {}), ...(end ? { lt: end } : {}) } } : {})
  };
  return { ok: true as const, where, filter };
}
