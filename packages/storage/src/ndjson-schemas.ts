import { z } from 'zod';
import type { NdjsonRecordType } from '@finplanner/domain';
import {
  householdProfileSchema,
  accountSchema,
  incomeStreamSchema,
  adjustmentSchema,
  appConfigSchema,
  taxYearRecordSchema,
  taxDocumentSchema,
  checklistItemSchema,
  anomalySchema,
  spendingPlanSchema,
  taxConfigSchema,
  marketConfigSchema,
  strategyConfigSchema,
  planResultSchema,
} from '@finplanner/validation';

// retirementPlan = composed of spending + taxes + market + strategy
const retirementPlanSchema = z.object({
  spending: spendingPlanSchema,
  taxes: taxConfigSchema,
  market: marketConfigSchema,
  strategy: strategyConfigSchema,
});

// simulationResult extends planResult with scenarioId
const simulationResultSchema = planResultSchema.extend({
  scenarioId: z.string(),
});

const schemaMap: Record<string, z.ZodTypeAny> = {
  household: householdProfileSchema,
  account: accountSchema,
  incomeStream: incomeStreamSchema,
  adjustment: adjustmentSchema,
  appConfig: appConfigSchema,
  taxYear: taxYearRecordSchema,
  taxDocument: taxDocumentSchema,
  checklistItem: checklistItemSchema,
  anomaly: anomalySchema,
  retirementPlan: retirementPlanSchema,
  simulationResult: simulationResultSchema,
};

export function getSchemaForType(type: NdjsonRecordType): z.ZodTypeAny | undefined {
  if (type === 'header') return undefined; // header handled separately
  return schemaMap[type];
}
