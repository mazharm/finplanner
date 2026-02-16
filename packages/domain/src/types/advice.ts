import type { PlanInput } from './plan.js';
import type { PlanResult } from './plan.js';
import type { HouseholdProfile } from './household.js';
import type { Account } from './accounts.js';
import type { IncomeStream } from './income.js';
import type { TaxYearRecord } from './tax-planning.js';

export interface PortfolioAdviceRequest {
  planInput: PlanInput;
  planResultSummary: PlanResult['summary'];
  userPreferences: {
    riskTolerance: 'conservative' | 'moderate' | 'aggressive';
    spendingFloor: number;
    legacyGoal: number;
  };
}

export interface PortfolioAdviceResponse {
  recommendations: Array<{
    title: string;
    rationale: string;
    expectedImpact: string;
    tradeoffs: string[];
    source: 'llm' | 'fallback';
  }>;
  withdrawalStrategyAdvice: Array<{ title: string; rationale: string }>;
  riskFlags: string[];
  assumptionSensitivity: string[];
  disclaimer: string;
}

export interface TaxStrategyAdviceRequest {
  taxYear: number;
  taxYearRecord: TaxYearRecord;
  priorYearRecord: TaxYearRecord | null;
  sharedCorpus: {
    household: HouseholdProfile;
    accounts: Account[];
    incomeStreams: IncomeStream[];
  };
  retirementProjectionSummary?: PlanResult['summary'];
  userPreferences: {
    prioritize: 'minimize_tax' | 'maximize_refund' | 'minimize_estimated_payments';
  };
}

export interface TaxStrategyAdviceResponse {
  recommendations: Array<{
    title: string;
    rationale: string;
    expectedImpact: string;
    tradeoffs: string[];
    source: 'llm' | 'fallback';
  }>;
  taxOptimizationOpportunities: Array<{ title: string; rationale: string }>;
  riskFlags: string[];
  disclaimer: string;
}
