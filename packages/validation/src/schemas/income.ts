import { z } from 'zod';
import { ownerSchema } from './common.js';

const MAX_FINANCIAL_AMOUNT = 1e15;

export const incomeStreamSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  owner: ownerSchema,
  startYear: z.number().int().min(1900).max(2200),
  endYear: z.number().int().min(1900).max(2200).optional(),
  annualAmount: z.number().finite().min(0).max(MAX_FINANCIAL_AMOUNT),
  colaPct: z.number().finite().min(-100).max(100).optional(),
  taxable: z.boolean(),
  survivorContinues: z.boolean().optional(),
}).refine(
  (data) => data.endYear === undefined || data.startYear <= data.endYear,
  { message: 'startYear must be <= endYear', path: ['endYear'] }
);

export const adjustmentSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  year: z.number().int().min(1900).max(2200),
  endYear: z.number().int().min(1900).max(2200).optional(),
  amount: z.number().finite().min(-MAX_FINANCIAL_AMOUNT).max(MAX_FINANCIAL_AMOUNT),
  taxable: z.boolean(),
  inflationAdjusted: z.boolean().optional(),
}).refine(
  (data) => data.endYear === undefined || data.year <= data.endYear,
  { message: 'year must be <= endYear', path: ['endYear'] }
);
