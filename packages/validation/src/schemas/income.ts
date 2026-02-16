import { z } from 'zod';
import { ownerSchema } from './common.js';

export const incomeStreamSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  owner: ownerSchema,
  startYear: z.number().int().min(1900).max(2200),
  endYear: z.number().int().min(1900).max(2200).optional(),
  annualAmount: z.number().min(0),
  colaPct: z.number().min(-100).max(100).optional(),
  taxable: z.boolean(),
  survivorContinues: z.boolean().optional(),
}).refine(
  (data) => data.endYear === undefined || data.startYear <= data.endYear,
  { message: 'startYear must be <= endYear', path: ['endYear'] }
);

export const adjustmentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  year: z.number().int().min(1900).max(2200),
  endYear: z.number().int().min(1900).max(2200).optional(),
  amount: z.number(),
  taxable: z.boolean(),
  inflationAdjusted: z.boolean().optional(),
}).refine(
  (data) => data.endYear === undefined || data.year <= data.endYear,
  { message: 'year must be <= endYear', path: ['endYear'] }
);
