import type { FilingStatus, TaxYearStatus, TaxFormType, ChecklistItemStatus, AnomalySeverity } from './common.js';

export interface TaxDocument {
  id: string;
  taxYear: number;
  formType: TaxFormType;
  issuerName: string;
  sourceFileName?: string;
  oneDrivePath?: string;
  extractedFields: Record<string, number | string>;
  fieldConfidence: Record<string, number>;
  extractionConfidence: number;
  lowConfidenceFields: string[];
  confirmedByUser: boolean;
  importedAt: string;
}

export interface TaxYearIncome {
  wages: number;
  selfEmploymentIncome: number;
  interestIncome: number;
  dividendIncome: number;
  qualifiedDividends: number;
  capitalGains: number;
  capitalLosses: number;
  rentalIncome: number;
  nqdcDistributions: number;
  retirementDistributions: number;
  socialSecurityIncome: number;
  otherIncome: number;
}

export interface TaxYearDeductions {
  standardDeduction: number;
  itemizedDeductions?: {
    mortgageInterest: number;
    stateAndLocalTaxes: number;
    charitableContributions: number;
    medicalExpenses: number;
    other: number;
  };
  useItemized: boolean;
}

export interface TaxYearCredits {
  childTaxCredit: number;
  educationCredits: number;
  foreignTaxCredit: number;
  otherCredits: number;
}

export interface TaxYearPayments {
  federalWithheld: number;
  stateWithheld: number;
  estimatedPaymentsFederal: number;
  estimatedPaymentsState: number;
}

export interface TaxYearRecord {
  taxYear: number;
  status: TaxYearStatus;
  filingStatus: FilingStatus;
  stateOfResidence: string;
  income: TaxYearIncome;
  deductions: TaxYearDeductions;
  credits: TaxYearCredits;
  payments: TaxYearPayments;
  computedFederalTax: number;
  computedStateTax: number;
  computedEffectiveFederalRate: number;
  computedEffectiveStateRate: number;
  refundOrBalanceDueFederal?: number;
  refundOrBalanceDueState?: number;
  documentIds: string[];
  notes?: string;
}

export interface ChecklistItem {
  id: string;
  taxYear: number;
  category: 'document' | 'income' | 'deduction' | 'life_event' | 'deadline';
  description: string;
  status: ChecklistItemStatus;
  sourceReasoning: string;
  relatedPriorYearItem?: string;
  linkedDocumentId?: string;
}

export interface TaxChecklist {
  taxYear: number;
  generatedAt: string;
  items: ChecklistItem[];
  completionPct: number;
}

export interface Anomaly {
  id: string;
  taxYear: number;
  comparisonYear: number;
  category: 'omission' | 'anomaly' | 'pattern_break';
  severity: AnomalySeverity;
  field: string;
  description: string;
  priorValue?: number | string;
  currentValue?: number | string;
  percentChange?: number;
  suggestedAction: string;
  llmAnalysis?: string;
}

export interface TaxAnalysisResult {
  taxYear: number;
  checklist: TaxChecklist;
  anomalies: Anomaly[];
  yearOverYearSummary: {
    totalIncomeChange: number;
    totalDeductionChange: number;
    effectiveRateChange: number;
    flagCount: { info: number; warning: number; critical: number };
  };
}
