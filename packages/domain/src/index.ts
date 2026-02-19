// Types
export type { FilingStatus, AccountType, SimulationMode, TaxYearStatus, ChecklistItemStatus, AnomalySeverity, TaxFormType, NdjsonRecordType } from './types/common.js';
export type { PersonProfile, HouseholdProfile } from './types/household.js';
export type { DeferredCompSchedule, Account } from './types/accounts.js';
export type { IncomeStream, Adjustment } from './types/income.js';
export type { SpendingPlan } from './types/spending.js';
export type { TaxConfig } from './types/tax-config.js';
export type { MarketConfig } from './types/market.js';
export type { StrategyConfig } from './types/strategy.js';
export type { PlanInput, YearResult, PlanResult } from './types/plan.js';
export type { TaxDocument, TaxYearIncome, TaxYearDeductions, TaxYearCredits, TaxYearPayments, TaxYearRecord, ChecklistItem, TaxChecklist, Anomaly, TaxAnalysisResult } from './types/tax-planning.js';
export type { PortfolioAdviceRequest, PortfolioAdviceResponse, TaxStrategyAdviceRequest, TaxStrategyAdviceResponse } from './types/advice.js';
export type { AppConfig } from './types/app-config.js';
export type { AppErrorCode, AppError } from './types/errors.js';
export type { HistoricalScenario, StateEntry, RmdEntry, RmdTable, StandardDeductions } from './types/data-assets.js';
export type { NdjsonHeader, NdjsonRecord } from './ndjson/types.js';

// Issuer matching utilities
export { normalizeIssuerName, tokenJaccardSimilarity, issuerNamesMatch } from './issuer-matching.js';

// Constants
export { SCHEMA_VERSION } from './constants/index.js';
export { STATE_TAX_DATA, VALID_STATE_CODES, lookupState, computeStateBracketTax } from './constants/state-tax-data.js';
export {
  DEFAULT_FEDERAL_EFFECTIVE_RATE_PCT,
  DEFAULT_CAP_GAINS_RATE_PCT,
  STANDARD_DEDUCTIONS,
  EXTRA_DEDUCTION_SINGLE_65_PLUS,
  EXTRA_DEDUCTION_MFJ_65_PLUS_PER_PERSON,
  SS_PROVISIONAL_INCOME_THRESHOLDS,
  WITHDRAWAL_CONVERGENCE_THRESHOLD,
  MAX_ITERATIONS,
  DEFAULT_ANOMALY_THRESHOLD_PCT,
  DEFAULT_ANOMALY_THRESHOLD_ABSOLUTE,
  DEFAULT_CONFIDENCE_THRESHOLD,
  DEFAULT_MONTE_CARLO_RUNS,
  GUARDRAIL_PORTFOLIO_CEILING_MULTIPLIER,
  GUARDRAIL_MAX_WITHDRAWAL_RATE_PCT,
  SS_WAGE_BASE,
  NIIT_RATE,
  NIIT_THRESHOLD_MFJ,
  NIIT_THRESHOLD_SINGLE,
  ADDITIONAL_MEDICARE_RATE,
  ADDITIONAL_MEDICARE_THRESHOLD_MFJ,
  ADDITIONAL_MEDICARE_THRESHOLD_SINGLE,
  CAPITAL_LOSS_DEDUCTION_CAP,
  SE_TAX_SS_RATE,
  SE_TAX_MEDICARE_RATE,
  SE_INCOME_ADJUSTMENT,
} from './constants/defaults.js';
