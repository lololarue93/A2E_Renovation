import { z } from "zod";

export const contactSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().max(160).refine(value => !value || z.string().email().safeParse(value).success).default(""),
  phone: z.string().trim().max(30).refine(value => !value || (/^[+\d\s().-]+$/.test(value) && value.replace(/\D/g, "").length >= 6)).default(""),
  city: z.string().trim().max(120).optional(),
  type: z.enum(["windows", "insulation", "electricity", "plumbing", "global", "hvac", "kitchen_bath", "roofing", "other"]),
  message: z.string().trim().min(10).max(12000),
  remarks: z.string().trim().max(2000).optional(),
  callbackRequested: z.boolean().optional(),
  callbackAvailability: z.string().trim().max(160).optional(),
  consent: z.literal(true),
  sessionId: z.string().max(80).optional(),
  analyticsConsent: z.boolean().optional(),
  website: z.string().max(0).optional()
}).strict().superRefine((value, context) => {
  if (!value.email && !value.phone) context.addIssue({ code: z.ZodIssueCode.custom, path: ["email"], message: "Indiquez un email ou un telephone pour etre recontacte." });
  if (value.callbackRequested && !value.phone) context.addIssue({ code: z.ZodIssueCode.custom, path: ["phone"], message: "Indiquez un telephone valide pour demander un rappel." });
});
