import type { TaxYearIncome, TaxYearDeductions, TaxYearCredits, TaxYearPayments } from '@finplanner/domain';

/** Dependency injection seam for Claude API calls */
export interface LlmClient {
  sendMessage(systemPrompt: string, userMessage: string): Promise<string>;
}

/** Anonymized portfolio context (PII stripped) */
export interface AnonymizedPortfolioContext {
  household: {
    filingStatus: string;
    stateOfResidence: string;
    primary: { currentAge: number; retirementAge: number; lifeExpectancy: number };
    spouse?: { currentAge: number; retirementAge: number; lifeExpectancy: number };
  };
  accounts: Array<{
    label: string;
    type: string;
    owner: string;
    currentBalance: number;
    expectedReturnPct: number;
    feePct: number;
  }>;
  incomeStreams: Array<{
    label: string;
    owner: string;
    startYear: number;
    endYear?: number;
    annualAmount: number;
    taxable: boolean;
  }>;
  taxes: {
    federalModel: string;
    stateModel: string;
    federalEffectiveRatePct?: number;
    stateEffectiveRatePct?: number;
    capGainsRatePct?: number;
  };
  simulationSummary: {
    successProbability?: number;
    medianTerminalValue?: number;
    worstCaseShortfall?: number;
  };
  userPreferences: {
    riskTolerance: string;
    spendingFloor: number;
    legacyGoal: number;
  };
}

/** Anonymized tax context (PII stripped) */
export interface AnonymizedTaxContext {
  taxYear: number;
  filingStatus: string;
  stateOfResidence: string;
  income: TaxYearIncome;
  deductions: TaxYearDeductions;
  credits: TaxYearCredits;
  payments: TaxYearPayments;
  computedFederalTax: number;
  computedStateTax: number;
  priorYear?: {
    taxYear: number;
    income: TaxYearIncome;
    deductions: TaxYearDeductions;
    credits: TaxYearCredits;
    payments: TaxYearPayments;
    computedFederalTax: number;
    computedStateTax: number;
  };
  documents: Array<{
    label: string;
    formType: string;
    extractedFields: Record<string, number | string>;
  }>;
  accounts: Array<{ label: string; type: string; currentBalance: number }>;
  userPreferences: { prioritize: string };
}
