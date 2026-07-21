import { z } from "zod";

export const leadSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(6),
  email: z.string().email(),
  consent: z.literal(true),
  input: z.record(z.unknown()),
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
