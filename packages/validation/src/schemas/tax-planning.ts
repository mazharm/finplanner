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
  fieldConfidence: z.record(z.string(), z.number()),
  extractionConfidence: z.number().min(0).max(1),
  lowConfidenceFields: z.array(z.string()),
  confirmedByUser: z.boolean(),
  importedAt: z.string(),
});

export const taxYearIncomeSchema = z.object({
  wages: z.number(),
  selfEmploymentIncome: z.number(),
  interestIncome: z.number(),
  dividendIncome: z.number(),
  qualifiedDividends: z.number(),
  capitalGains: z.number(),
  capitalLosses: z.number(),
  rentalIncome: z.number(),
  nqdcDistributions: z.number(),
  retirementDistributions: z.number(),
  socialSecurityIncome: z.number(),
  otherIncome: z.number(),
});

export const taxYearDeductionsSchema = z.object({
  standardDeduction: z.number().min(0),
  itemizedDeductions: z.object({
    mortgageInterest: z.number(),
    stateAndLocalTaxes: z.number(),
    charitableContributions: z.number(),
    medicalExpenses: z.number(),
    other: z.number(),
  }).optional(),
  useItemized: z.boolean(),
});

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
  stateOfResidence: z.string().length(2),
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
