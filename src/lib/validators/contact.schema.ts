import { z } from "zod";

export const contactSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email().max(160),
  phone: z.string().trim().min(6).max(30).regex(/^[+\d\s().-]+$/),
  city: z.string().trim().max(120).optional(),
  type: z.enum(["windows", "insulation", "electricity", "plumbing", "global", "hvac", "kitchen_bath", "roofing", "other"]),
  message: z.string().trim().min(10).max(12000),
  consent: z.literal(true),
  sessionId: z.string().max(80).optional(),
  analyticsConsent: z.boolean().optional(),
  website: z.string().max(0).optional()
}).strict();
