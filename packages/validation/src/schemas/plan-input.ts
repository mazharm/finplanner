import { z } from 'zod';
import { householdProfileSchema } from './household.js';
import { accountSchema } from './accounts.js';
import { incomeStreamSchema, adjustmentSchema } from './income.js';
import { spendingPlanSchema } from './spending.js';
import { taxConfigSchema } from './tax-config.js';
import { marketConfigSchema } from './market.js';
import { strategyConfigSchema } from './strategy.js';

export const planInputSchema = z.object({
  schemaVersion: z.string(),
  household: householdProfileSchema,
  accounts: z.array(accountSchema),
  otherIncome: z.array(incomeStreamSchema),
  adjustments: z.array(adjustmentSchema),
  spending: spendingPlanSchema,
  taxes: taxConfigSchema,
  market: marketConfigSchema,
  strategy: strategyConfigSchema,
}).refine(
  (data) => {
    if (data.strategy.guardrailsEnabled) {
      const { floorAnnualSpend, ceilingAnnualSpend, targetAnnualSpend } = data.spending;
      if (floorAnnualSpend !== undefined && floorAnnualSpend >= targetAnnualSpend) return false;
      if (ceilingAnnualSpend !== undefined && ceilingAnnualSpend <= targetAnnualSpend) return false;
      if (floorAnnualSpend !== undefined && ceilingAnnualSpend !== undefined && floorAnnualSpend >= ceilingAnnualSpend) return false;
    }
    return true;
  },
  { message: 'Guardrail invariant violated: floor < target < ceiling', path: ['spending'] }
).refine(
  (data) => {
    if (data.strategy.rebalanceFrequency !== 'none') {
      const accountsWithTarget = data.accounts.filter(a => a.targetAllocationPct !== undefined);
      if (accountsWithTarget.length >= 2) {
        const sum = accountsWithTarget.reduce((s, a) => s + (a.targetAllocationPct ?? 0), 0);
        return Math.abs(sum - 100) < 0.01;
      }
    }
    return true;
  },
  { message: 'Target allocation percentages must sum to 100 when rebalancing is enabled', path: ['accounts'] }
);
