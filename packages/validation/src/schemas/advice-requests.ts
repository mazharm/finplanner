import { z } from 'zod';
import { planInputSchema } from './plan-input.js';
import { taxYearRecordSchema } from './tax-planning.js';
import { householdProfileSchema } from './household.js';
import { accountSchema } from './accounts.js';
import { incomeStreamSchema } from './income.js';

export const portfolioAdviceRequestSchema = z.object({
  planInput: planInputSchema,
  planResultSummary: z.object({
    successProbability: z.number().min(0).max(1).optional(),
    medianTerminalValue: z.number().optional(),
    worstCaseShortfall: z.number().optional(),
  }),
  userPreferences: z.object({
    riskTolerance: z.enum(['conservative', 'moderate', 'aggressive']),
    spendingFloor: z.number().min(0),
    legacyGoal: z.number().min(0),
  }),
});

export const taxStrategyAdviceRequestSchema = z.object({
  taxYear: z.number().int(),
  taxYearRecord: taxYearRecordSchema,
  priorYearRecord: taxYearRecordSchema.nullable(),
  sharedCorpus: z.object({
    household: householdProfileSchema,
    accounts: z.array(accountSchema),
    incomeStreams: z.array(incomeStreamSchema),
  }),
  retirementProjectionSummary: z.object({
    successProbability: z.number().optional(),
    medianTerminalValue: z.number().optional(),
    worstCaseShortfall: z.number().optional(),
  }).optional(),
  userPreferences: z.object({
    prioritize: z.enum(['minimize_tax', 'maximize_refund', 'minimize_estimated_payments']),
  }),
});

export const taxChecklistSchema = z.object({
  taxYear: z.number().int(),
  generatedAt: z.string().datetime({ offset: true }),
  items: z.array(z.object({
    id: z.string().min(1),
    taxYear: z.number().int(),
    category: z.enum(['document', 'income', 'deduction', 'life_event', 'deadline']),
    description: z.string(),
    status: z.enum(['pending', 'received', 'not_applicable', 'waived']),
    sourceReasoning: z.string(),
    relatedPriorYearItem: z.string().optional(),
    linkedDocumentId: z.string().optional(),
  })),
  completionPct: z.number().min(0).max(100),
});

export const taxAnalysisResultSchema = z.object({
  taxYear: z.number().int(),
  checklist: taxChecklistSchema,
  anomalies: z.array(z.object({
    id: z.string().min(1),
    taxYear: z.number().int(),
    comparisonYear: z.number().int(),
    category: z.enum(['omission', 'anomaly', 'pattern_break']),
    severity: z.enum(['info', 'warning', 'critical']),
    field: z.string(),
    description: z.string(),
    priorValue: z.union([z.number(), z.string()]).optional(),
    currentValue: z.union([z.number(), z.string()]).optional(),
    percentChange: z.number().optional(),
    suggestedAction: z.string(),
    llmAnalysis: z.string().optional(),
  })),
  yearOverYearSummary: z.object({
    totalIncomeChange: z.number(),
    totalDeductionChange: z.number(),
    effectiveRateChange: z.number(),
    flagCount: z.object({
      info: z.number().int().min(0),
      warning: z.number().int().min(0),
      critical: z.number().int().min(0),
    }),
  }),
});
