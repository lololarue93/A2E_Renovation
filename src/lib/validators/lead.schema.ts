import { z } from "zod";

import { estimateInputSchema } from "./estimate.schema";

export const leadSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(6).max(30),
  email: z.string().trim().email().max(160),
  message: z.string().trim().max(12000).optional(),
  remarks: z.string().trim().max(2000).optional(),
  callbackRequested: z.boolean().optional(),
  callbackAvailability: z.string().trim().max(160).optional(),
  consent: z.literal(true),
  input: estimateInputSchema,
  sessionId: z.string().max(80).optional(),
  analyticsConsent: z.boolean().optional(),
  result: z.object({
    low: z.number(),
    mid: z.number(),
    high: z.number(),
    duration: z.string(),
    complexity: z.string(),
    maturityScore: z.number(),
    lines: z.array(z.object({
      label: z.string(),
      quantity: z.number(),
      unit: z.string(),
      low: z.number(),
      mid: z.number(),
      high: z.number()
      ,reference: z.string().optional()
      ,description: z.string().optional()
      ,vatRate: z.number().optional()
    })).default([]),
    assumptions: z.array(z.string()).default([])
  })
}).superRefine((value, context) => {
  if (value.callbackRequested && (!/^[+\d\s().-]+$/.test(value.phone) || value.phone.replace(/\D/g, "").length < 6)) context.addIssue({ code: z.ZodIssueCode.custom, path: ["phone"], message: "Indiquez un telephone valide pour demander un rappel." });
});

export type LeadPayload = z.infer<typeof leadSchema>;
