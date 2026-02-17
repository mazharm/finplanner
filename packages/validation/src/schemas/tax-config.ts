import { z } from 'zod';

export const taxConfigSchema = z.object({
  federalModel: z.enum(['effective', 'bracket']),
  stateModel: z.enum(['effective', 'bracket', 'none']),
  federalEffectiveRatePct: z.number().min(0).max(100).optional(),
  stateEffectiveRatePct: z.number().min(0).max(100).optional(),
  stateCapGainsRatePct: z.number().min(0).max(100).optional(),
  capGainsRatePct: z.number().min(0).max(100).optional(),
  standardDeductionOverride: z.number().min(0).optional(),
}).refine(
  (data) => data.federalModel !== 'effective' || data.federalEffectiveRatePct !== undefined,
  { message: 'federalEffectiveRatePct is required when federalModel is "effective"', path: ['federalEffectiveRatePct'] }
).refine(
  (data) => data.stateModel !== 'effective' || data.stateEffectiveRatePct !== undefined,
  { message: 'stateEffectiveRatePct is required when stateModel is "effective"', path: ['stateEffectiveRatePct'] }
);
