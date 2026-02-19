import { z } from 'zod';
import { householdProfileSchema } from './household.js';
import { accountSchema } from './accounts.js';
import { incomeStreamSchema, adjustmentSchema } from './income.js';
import { spendingPlanSchema } from './spending.js';
import { taxConfigSchema } from './tax-config.js';
import { marketConfigSchema } from './market.js';
import { strategyConfigSchema } from './strategy.js';

export const planInputSchema = z.object({
  schemaVersion: z.string().regex(/^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/, 'Must be valid semver'),
  household: householdProfileSchema,
  accounts: z.array(accountSchema).min(1, 'At least one account is required').max(200),
  otherIncome: z.array(incomeStreamSchema).max(200),
  adjustments: z.array(adjustmentSchema).max(200),
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

  // Account IDs must be unique
  const accountIds = new Set<string>();
  for (const account of data.accounts) {
    if (accountIds.has(account.id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate account ID: "${account.id}"`,
        path: ['accounts'],
      });
      break;
    }
    accountIds.add(account.id);
  }

  // Rebalance targets must sum to ~100% when rebalancing is enabled
  if (data.strategy.rebalanceFrequency !== 'none') {
    const accountsWithTarget = data.accounts.filter(a => a.targetAllocationPct !== undefined);
    if (accountsWithTarget.length >= 2) {
      const sum = Math.round(accountsWithTarget.reduce((s, a) => s + (a.targetAllocationPct ?? 0), 0) * 100) / 100;
      if (Math.abs(sum - 100) >= 0.01) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Target allocation percentages must sum to 100% when rebalancing is enabled (got ${sum.toFixed(2)}%)`,
          path: ['accounts'],
        });
      }
    }
  }

  // Account owners must be consistent with household configuration
  const hasSpouse = data.household.spouse !== undefined;
  for (let i = 0; i < data.accounts.length; i++) {
    const acct = data.accounts[i];
    if (!hasSpouse && (acct.owner === 'spouse' || acct.owner === 'joint')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Account "${acct.name}" has owner "${acct.owner}" but no spouse is configured`,
        path: ['accounts', i, 'owner'],
      });
    }
  }
});
