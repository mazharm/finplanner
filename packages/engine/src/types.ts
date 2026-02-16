import type { FilingStatus, Account, PlanInput } from '@finplanner/domain';

export interface AccountState {
  id: string;
  type: Account['type'];
  owner: Account['owner'];
  balance: number;
  costBasis: number;
  expectedReturnPct: number;
  feePct: number;
  targetAllocationPct?: number;
  deferredCompSchedule?: Account['deferredCompSchedule'];
}

export interface YearContext {
  yearIndex: number;
  calendarYear: number;
  agePrimary: number;
  ageSpouse?: number;
  isSurvivorPhase: boolean;
  survivorId?: 'primary' | 'spouse';
  survivorYearCount: number;
  filingStatus: FilingStatus;
  primaryAlive: boolean;
  spouseAlive: boolean;
}

export interface SimulationState {
  accounts: AccountState[];
  plan: PlanInput;
  currentYear: number;
  yearIndex: number;
  priorYearEffectiveRate: number;
  scenarioReturns?: number[];
  scenarioInflation?: number[];
  baselineReturn: number;
  survivorTransitioned: boolean;
  firstSurvivorYearIndex: number;
  /**
   * Precomputed cumulative inflation multipliers, built incrementally.
   * cumulativeInflationByYear[i] = product of (1 + rate_j/100) for j in 0..i-1
   * So index 0 = 1.0, index 1 = (1 + rate_0/100), etc.
   */
  cumulativeInflationByYear: number[];
}

export interface MandatoryIncome {
  socialSecurityIncome: number;
  nqdcDistributions: number;
  pensionAndOtherIncome: number;
  adjustmentIncome: number;
  totalMandatoryTaxableOrdinary: number;
  totalMandatoryTaxableCapGains: number;
}

export interface RmdResult {
  rmdTotal: number;
  rmdByAccount: Record<string, number>;
}

export interface SpendingResult {
  targetSpend: number;
  actualSpend: number;
}

export interface WithdrawalResult {
  withdrawalsByAccount: Record<string, number>;
  totalWithdrawn: number;
  taxableOrdinaryFromWithdrawals: number;
  taxableCapGainsFromWithdrawals: number;
  rothWithdrawals: number;
}

export interface TaxResult {
  taxesFederal: number;
  taxesState: number;
  taxableOrdinaryIncome: number;
  taxableCapitalGains: number;
}

export interface NetSpendableResult {
  netSpendable: number;
  shortfall: number;
  surplus: number;
  grossIncome: number;
}
