import { z } from 'zod';
import { accountTypeSchema, ownerSchema } from './common.js';

export const deferredCompScheduleSchema = z.object({
  startYear: z.number().int().min(1900).max(2200),
  endYear: z.number().int().min(1900).max(2200),
  frequency: z.enum(['annual', 'monthly']),
  amount: z.number().min(0),
  inflationAdjusted: z.boolean(),
}).refine(
  (data) => data.startYear <= data.endYear,
  { message: 'startYear must be <= endYear', path: ['endYear'] }
);

export const accountSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  type: accountTypeSchema,
  owner: ownerSchema,
  currentBalance: z.number().min(0),
  costBasis: z.number().min(0).optional(),
  expectedReturnPct: z.number().min(-100).max(100),
  volatilityPct: z.number().min(0).max(100).optional(),
  feePct: z.number().min(0).max(10),
  targetAllocationPct: z.number().min(0).max(100).optional(),
  deferredCompSchedule: deferredCompScheduleSchema.optional(),
}).refine(
  (data) => data.owner !== 'joint' || data.type === 'taxable',
  { message: 'Joint ownership is only valid for taxable accounts', path: ['owner'] }
).refine(
  (data) => data.deferredCompSchedule === undefined || data.type === 'deferredComp',
  { message: 'deferredCompSchedule is only valid for deferredComp accounts', path: ['deferredCompSchedule'] }
).refine(
  (data) => {
    // Warn-level check: if volatility is provided, expected return should be
    // plausible relative to risk. A return > 3x volatility is unrealistic.
    if (data.volatilityPct === undefined || data.volatilityPct === 0) return true;
    return Math.abs(data.expectedReturnPct) <= data.volatilityPct * 3;
  },
  { message: 'expectedReturnPct appears unrealistic relative to volatilityPct (return > 3x volatility)', path: ['expectedReturnPct'] }
);
