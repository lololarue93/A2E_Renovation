import { z } from "zod";

import { estimateInputSchema } from "./estimate.schema";

export const leadSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(6).max(30),
  email: z.string().trim().email().max(160),
  consent: z.literal(true),
  input: estimateInputSchema,
  sessionId: z.string().max(80).optional(),
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
});

export type LeadPayload = z.infer<typeof leadSchema>;
