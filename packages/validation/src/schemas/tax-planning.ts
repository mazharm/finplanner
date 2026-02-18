import { z } from 'zod';
import { filingStatusSchema, taxYearStatusSchema, taxFormTypeSchema, checklistItemStatusSchema, anomalySeveritySchema } from './common.js';
import { VALID_STATE_CODES } from '@finplanner/domain';

const MAX_FINANCIAL_AMOUNT = 1e15;

export const taxDocumentSchema = z.object({
  id: z.string().min(1).max(100),
  taxYear: z.number().int().min(1900).max(2200),
  formType: taxFormTypeSchema,
  issuerName: z.string().min(1).max(500),
  sourceFileName: z.string().max(500).optional(),
  oneDrivePath: z.string().max(1000).optional(),
  extractedFields: z.record(z.string().max(200), z.union([z.number().finite(), z.string().max(1000)])),
  fieldConfidence: z.record(z.string(), z.number().finite().min(0).max(1)),
  extractionConfidence: z.number().finite().min(0).max(1),
  lowConfidenceFields: z.array(z.string()).max(200),
  confirmedByUser: z.boolean(),
  importedAt: z.string().datetime({ offset: true }),
});

export const taxYearIncomeSchema = z.object({
  wages: z.number().finite().min(0).max(MAX_FINANCIAL_AMOUNT),
  selfEmploymentIncome: z.number().finite().min(-MAX_FINANCIAL_AMOUNT).max(MAX_FINANCIAL_AMOUNT), // Can be negative (net loss)
  interestIncome: z.number().finite().min(0).max(MAX_FINANCIAL_AMOUNT),
  dividendIncome: z.number().finite().min(0).max(MAX_FINANCIAL_AMOUNT),
  qualifiedDividends: z.number().finite().min(0).max(MAX_FINANCIAL_AMOUNT),
  capitalGains: z.number().finite().min(0).max(MAX_FINANCIAL_AMOUNT),
  capitalLosses: z.number().finite().min(0).max(MAX_FINANCIAL_AMOUNT),
  rentalIncome: z.number().finite().min(-MAX_FINANCIAL_AMOUNT).max(MAX_FINANCIAL_AMOUNT), // Can be negative (rental losses are common)
  nqdcDistributions: z.number().finite().min(0).max(MAX_FINANCIAL_AMOUNT),
  retirementDistributions: z.number().finite().min(0).max(MAX_FINANCIAL_AMOUNT),
  socialSecurityIncome: z.number().finite().min(0).max(MAX_FINANCIAL_AMOUNT),
  otherIncome: z.number().finite().min(0).max(MAX_FINANCIAL_AMOUNT),
}).refine(
  (d) => d.qualifiedDividends <= d.dividendIncome,
  { message: 'qualifiedDividends must be <= dividendIncome', path: ['qualifiedDividends'] }
);

export const taxYearDeductionsSchema = z.object({
  standardDeduction: z.number().finite().min(0).max(MAX_FINANCIAL_AMOUNT),
  itemizedDeductions: z.object({
    mortgageInterest: z.number().finite().min(0).max(MAX_FINANCIAL_AMOUNT),
    stateAndLocalTaxes: z.number().finite().min(0).max(MAX_FINANCIAL_AMOUNT),
    charitableContributions: z.number().finite().min(0).max(MAX_FINANCIAL_AMOUNT),
    medicalExpenses: z.number().finite().min(0).max(MAX_FINANCIAL_AMOUNT),
    other: z.number().finite().min(0).max(MAX_FINANCIAL_AMOUNT),
  }).optional(),
  useItemized: z.boolean(),
}).refine(
  (data) => !data.useItemized || data.itemizedDeductions !== undefined,
  { message: 'itemizedDeductions is required when useItemized is true', path: ['itemizedDeductions'] }
);

export const taxYearCreditsSchema = z.object({
  childTaxCredit: z.number().finite().min(0).max(MAX_FINANCIAL_AMOUNT),
  educationCredits: z.number().finite().min(0).max(MAX_FINANCIAL_AMOUNT),
  foreignTaxCredit: z.number().finite().min(0).max(MAX_FINANCIAL_AMOUNT),
  otherCredits: z.number().finite().min(0).max(MAX_FINANCIAL_AMOUNT),
});

export const taxYearPaymentsSchema = z.object({
  federalWithheld: z.number().finite().min(0).max(MAX_FINANCIAL_AMOUNT),
  stateWithheld: z.number().finite().min(0).max(MAX_FINANCIAL_AMOUNT),
  estimatedPaymentsFederal: z.number().finite().min(0).max(MAX_FINANCIAL_AMOUNT),
  estimatedPaymentsState: z.number().finite().min(0).max(MAX_FINANCIAL_AMOUNT),
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
  computedFederalTax: z.number().finite(),
  computedStateTax: z.number().finite(),
  computedEffectiveFederalRate: z.number().finite(),
  computedEffectiveStateRate: z.number().finite(),
  refundOrBalanceDueFederal: z.number().finite().optional(),
  refundOrBalanceDueState: z.number().finite().optional(),
  documentIds: z.array(z.string().max(100)).max(500),
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
  priorValue: z.union([z.number().finite(), z.string().max(500)]).optional(),
  currentValue: z.union([z.number().finite(), z.string().max(500)]).optional(),
  percentChange: z.number().finite().optional(),
  suggestedAction: z.string().max(2000),
  llmAnalysis: z.string().max(5000).optional(),
});
