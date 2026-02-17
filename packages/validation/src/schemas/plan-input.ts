import { z } from 'zod';
import { householdProfileSchema } from './household.js';
import { accountSchema } from './accounts.js';
import { incomeStreamSchema, adjustmentSchema } from './income.js';
import { spendingPlanSchema } from './spending.js';
import { taxConfigSchema } from './tax-config.js';
import { marketConfigSchema } from './market.js';
import { strategyConfigSchema } from './strategy.js';

export const planInputSchema = z.object({
  schemaVersion: z.string().regex(/^\d+\.\d+\.\d+/, 'Must be valid semver'),
  household: householdProfileSchema,
  accounts: z.array(accountSchema).min(1, 'At least one account is required'),
  otherIncome: z.array(incomeStreamSchema),
  adjustments: z.array(adjustmentSchema),
  spending: spendingPlanSchema,
  taxes: taxConfigSchema,
  market: marketConfigSchema,
  strategy: strategyConfigSchema,
}).superRefine((data, ctx) => {
  // Guardrail invariant: floor < target < ceiling
  if (data.strategy.guardrailsEnabled) {
    const { floorAnnualSpend, ceilingAnnualSpend, targetAnnualSpend } = data.spending;
    if (floorAnnualSpend !== undefined && floorAnnualSpend >= targetAnnualSpend) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Guardrail floor must be less than target spending',
        path: ['spending', 'floorAnnualSpend'],
      });
    }
    if (ceilingAnnualSpend !== undefined && ceilingAnnualSpend <= targetAnnualSpend) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Guardrail ceiling must be greater than target spending',
        path: ['spending', 'ceilingAnnualSpend'],
      });
    }
    if (floorAnnualSpend !== undefined && ceilingAnnualSpend !== undefined && floorAnnualSpend > ceilingAnnualSpend) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Guardrail floor must be <= ceiling',
        path: ['spending', 'floorAnnualSpend'],
      });
    }
  }

  // Rebalance targets must sum to ~100% when rebalancing is enabled
  if (data.strategy.rebalanceFrequency !== 'none') {
    const accountsWithTarget = data.accounts.filter(a => a.targetAllocationPct !== undefined);
    if (accountsWithTarget.length >= 2) {
      const sum = accountsWithTarget.reduce((s, a) => s + (a.targetAllocationPct ?? 0), 0);
      if (Math.abs(sum - 100) >= 0.01) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Target allocation percentages must sum to 100% when rebalancing is enabled (got ${sum.toFixed(2)}%)`,
          path: ['accounts'],
        });
      }
    }
  }
});
