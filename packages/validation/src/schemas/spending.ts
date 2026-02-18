import { z } from 'zod';

export const spendingPlanSchema = z.object({
  targetAnnualSpend: z.number().min(0),
  inflationPct: z.number().min(-100).max(100),
  floorAnnualSpend: z.number().min(0).optional(),
  ceilingAnnualSpend: z.number().min(0).optional(),
  survivorSpendingAdjustmentPct: z.number().min(10).max(100),
});
