import type { FilingStatus } from './common.js';
import type { HouseholdProfile } from './household.js';
import type { Account } from './accounts.js';
import type { IncomeStream, Adjustment } from './income.js';
import type { SpendingPlan } from './spending.js';
import type { TaxConfig } from './tax-config.js';
import type { MarketConfig } from './market.js';
import type { StrategyConfig } from './strategy.js';

export interface PlanInput {
  schemaVersion: string;
  household: HouseholdProfile;
  accounts: Account[];
  otherIncome: IncomeStream[];
  adjustments: Adjustment[];
  spending: SpendingPlan;
  taxes: TaxConfig;
  market: MarketConfig;
  strategy: StrategyConfig;
}

export interface YearResult {
  year: number;
  agePrimary: number;
  ageSpouse?: number;
  isSurvivorPhase: boolean;
  filingStatus: FilingStatus;
  targetSpend: number;
  actualSpend: number;
  grossIncome: number;
  socialSecurityIncome: number;
  nqdcDistributions: number;
  rmdTotal: number;
  pensionAndOtherIncome: number;
  rothWithdrawals: number;
  withdrawalsByAccount: Record<string, number>;
  taxesFederal: number;
  taxesState: number;
  taxableOrdinaryIncome: number;
  taxableCapitalGains: number;
  netSpendable: number;
  shortfall: number;
  surplus: number;
  endBalanceByAccount: Record<string, number>;
  costBasisByAccount?: Record<string, number>;
}

export interface PlanResult {
  summary: {
    successProbability?: number;
    medianTerminalValue?: number;
    worstCaseShortfall?: number;
  };
  yearly: YearResult[];
  assumptionsUsed: Record<string, unknown>;
}
