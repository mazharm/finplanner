import { z } from 'zod';
import { accountTypeSchema, ownerSchema } from './common.js';

export const deferredCompScheduleSchema = z.object({
  startYear: z.number().int().min(1900).max(2200),
  endYear: z.number().int().min(1900).max(2200),
  frequency: z.enum(['annual', 'monthly']),
  amount: z.number().min(0),
  inflationAdjusted: z.boolean(),
});

export const accountSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: accountTypeSchema,
  owner: ownerSchema,
  currentBalance: z.number().min(0),
  costBasis: z.number().min(0).optional(),
  expectedReturnPct: z.number().min(-100).max(100),
  volatilityPct: z.number().min(0).max(100).optional(),
  feePct: z.number().min(0).max(100),
  targetAllocationPct: z.number().min(0).max(100).optional(),
  deferredCompSchedule: deferredCompScheduleSchema.optional(),
}).refine(
  (data) => data.owner !== 'joint' || data.type === 'taxable',
  { message: 'Joint ownership is only valid for taxable accounts', path: ['owner'] }
);
