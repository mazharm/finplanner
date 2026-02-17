import { z } from 'zod';
import { filingStatusSchema, taxYearStatusSchema, taxFormTypeSchema, checklistItemStatusSchema, anomalySeveritySchema } from './common.js';
import { VALID_STATE_CODES } from '@finplanner/domain';

export const taxDocumentSchema = z.object({
  id: z.string().min(1).max(100),
  taxYear: z.number().int().min(1900).max(2200),
  formType: taxFormTypeSchema,
  issuerName: z.string().min(1).max(500),
  sourceFileName: z.string().max(500).optional(),
  oneDrivePath: z.string().max(1000).optional(),
  extractedFields: z.record(z.string().max(200), z.union([z.number(), z.string().max(1000)])),
  fieldConfidence: z.record(z.string(), z.number().min(0).max(1)),
  extractionConfidence: z.number().min(0).max(1),
  lowConfidenceFields: z.array(z.string()),
  confirmedByUser: z.boolean(),
  importedAt: z.string().datetime({ offset: true }),
});

export const taxYearIncomeSchema = z.object({
  wages: z.number().min(0),
  selfEmploymentIncome: z.number(), // Can be negative (net loss)
  interestIncome: z.number().min(0),
  dividendIncome: z.number().min(0),
  qualifiedDividends: z.number().min(0),
  capitalGains: z.number().min(0),
  capitalLosses: z.number().min(0),
  rentalIncome: z.number(), // Can be negative (rental losses are common)
  nqdcDistributions: z.number().min(0),
  retirementDistributions: z.number().min(0),
  socialSecurityIncome: z.number().min(0),
  otherIncome: z.number().min(0),
}).refine(
  (d) => d.qualifiedDividends <= d.dividendIncome,
  { message: 'qualifiedDividends must be <= dividendIncome', path: ['qualifiedDividends'] }
);

export const taxYearDeductionsSchema = z.object({
  standardDeduction: z.number().min(0),
  itemizedDeductions: z.object({
    mortgageInterest: z.number().min(0),
    stateAndLocalTaxes: z.number().min(0),
    charitableContributions: z.number().min(0),
    medicalExpenses: z.number().min(0),
    other: z.number().min(0),
  }).optional(),
  useItemized: z.boolean(),
}).refine(
  (data) => !data.useItemized || data.itemizedDeductions !== undefined,
  { message: 'itemizedDeductions is required when useItemized is true', path: ['itemizedDeductions'] }
);

export const taxYearCreditsSchema = z.object({
  childTaxCredit: z.number().min(0),
  educationCredits: z.number().min(0),
  foreignTaxCredit: z.number().min(0),
  otherCredits: z.number().min(0),
});

export const taxYearPaymentsSchema = z.object({
  federalWithheld: z.number().min(0),
  stateWithheld: z.number().min(0),
  estimatedPaymentsFederal: z.number().min(0),
  estimatedPaymentsState: z.number().min(0),
});

export const taxYearRecordSchema = z.object({
  taxYear: z.number().int().min(1900).max(2200),
  status: taxYearStatusSchema,
  filingStatus: filingStatusSchema,
  stateOfResidence: z.string().refine(
    (code) => new Set(VALID_STATE_CODES).has(code),
    { message: 'Must be a valid US state code (e.g., CA, NY, TX)' },
  ),
  income: taxYearIncomeSchema,
  deductions: taxYearDeductionsSchema,
  credits: taxYearCreditsSchema,
  payments: taxYearPaymentsSchema,
  computedFederalTax: z.number(),
  computedStateTax: z.number(),
  computedEffectiveFederalRate: z.number(),
  computedEffectiveStateRate: z.number(),
  refundOrBalanceDueFederal: z.number().optional(),
  refundOrBalanceDueState: z.number().optional(),
  documentIds: z.array(z.string().max(100)),
  notes: z.string().max(5000).optional(),
});

export const checklistItemSchema = z.object({
  id: z.string().min(1).max(100),
  taxYear: z.number().int().min(1900).max(2200),
  category: z.enum(['document', 'income', 'deduction', 'life_event', 'deadline']),
  description: z.string().max(2000),
  status: checklistItemStatusSchema,
  sourceReasoning: z.string().max(2000),
  relatedPriorYearItem: z.string().max(100).optional(),
  linkedDocumentId: z.string().max(100).optional(),
});

export const anomalySchema = z.object({
  id: z.string().min(1).max(100),
  taxYear: z.number().int().min(1900).max(2200),
  comparisonYear: z.number().int().min(1900).max(2200),
  category: z.enum(['omission', 'anomaly', 'pattern_break']),
  severity: anomalySeveritySchema,
  field: z.string().max(200),
  description: z.string().max(2000),
  priorValue: z.union([z.number(), z.string().max(500)]).optional(),
  currentValue: z.union([z.number(), z.string().max(500)]).optional(),
  percentChange: z.number().optional(),
  suggestedAction: z.string().max(2000),
  llmAnalysis: z.string().max(5000).optional(),
});
