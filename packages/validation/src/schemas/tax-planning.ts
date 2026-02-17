import { z } from 'zod';
import { filingStatusSchema, taxYearStatusSchema, taxFormTypeSchema, checklistItemStatusSchema, anomalySeveritySchema } from './common.js';

export const taxDocumentSchema = z.object({
  id: z.string().min(1),
  taxYear: z.number().int(),
  formType: taxFormTypeSchema,
  issuerName: z.string().min(1),
  sourceFileName: z.string().optional(),
  oneDrivePath: z.string().optional(),
  extractedFields: z.record(z.string(), z.union([z.number(), z.string()])),
  fieldConfidence: z.record(z.string(), z.number().min(0).max(1)),
  extractionConfidence: z.number().min(0).max(1),
  lowConfidenceFields: z.array(z.string()),
  confirmedByUser: z.boolean(),
  importedAt: z.string().datetime({ offset: true }),
});

export const taxYearIncomeSchema = z.object({
  wages: z.number().min(0),
  selfEmploymentIncome: z.number().min(0),
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
  taxYear: z.number().int(),
  status: taxYearStatusSchema,
  filingStatus: filingStatusSchema,
  stateOfResidence: z.string().regex(/^[A-Z]{2}$/, 'Must be a 2-letter uppercase state code'),
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
  documentIds: z.array(z.string()),
  notes: z.string().optional(),
});

export const checklistItemSchema = z.object({
  id: z.string().min(1),
  taxYear: z.number().int(),
  category: z.enum(['document', 'income', 'deduction', 'life_event', 'deadline']),
  description: z.string(),
  status: checklistItemStatusSchema,
  sourceReasoning: z.string(),
  relatedPriorYearItem: z.string().optional(),
  linkedDocumentId: z.string().optional(),
});

export const anomalySchema = z.object({
  id: z.string().min(1),
  taxYear: z.number().int(),
  comparisonYear: z.number().int(),
  category: z.enum(['omission', 'anomaly', 'pattern_break']),
  severity: anomalySeveritySchema,
  field: z.string(),
  description: z.string(),
  priorValue: z.union([z.number(), z.string()]).optional(),
  currentValue: z.union([z.number(), z.string()]).optional(),
  percentChange: z.number().optional(),
  suggestedAction: z.string(),
  llmAnalysis: z.string().optional(),
});
