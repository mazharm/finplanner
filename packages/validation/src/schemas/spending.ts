import { z } from 'zod';

const MAX_FINANCIAL_AMOUNT = 1e15;

export const spendingPlanSchema = z.object({
  targetAnnualSpend: z.number().finite().min(0).max(MAX_FINANCIAL_AMOUNT),
  inflationPct: z.number().finite().min(-100).max(100),
  floorAnnualSpend: z.number().finite().min(0).max(MAX_FINANCIAL_AMOUNT).optional(),
  ceilingAnnualSpend: z.number().finite().min(0).max(MAX_FINANCIAL_AMOUNT).optional(),
  survivorSpendingAdjustmentPct: z.number().finite().min(10).max(100),
});
