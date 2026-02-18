export const DEFAULT_FEDERAL_EFFECTIVE_RATE_PCT = 22;
export const DEFAULT_CAP_GAINS_RATE_PCT = 15;

export const STANDARD_DEDUCTIONS = {
  single: 15_000,
  mfj: 30_000,
  survivor: 30_000,
  hoh: 22_500,
} as const;

export const EXTRA_DEDUCTION_SINGLE_65_PLUS = 1_550;
export const EXTRA_DEDUCTION_MFJ_65_PLUS_PER_PERSON = 1_300;

export const SS_PROVISIONAL_INCOME_THRESHOLDS = {
  mfj: { lower: 32_000, upper: 44_000, midBandCap: 6_000 },
  survivor: { lower: 32_000, upper: 44_000, midBandCap: 6_000 },
  single: { lower: 25_000, upper: 34_000, midBandCap: 4_500 },
  hoh: { lower: 25_000, upper: 34_000, midBandCap: 4_500 },
} as const;

export const WITHDRAWAL_CONVERGENCE_THRESHOLD = 100;
export const MAX_ITERATIONS = 12;

export const DEFAULT_ANOMALY_THRESHOLD_PCT = 25;
export const DEFAULT_ANOMALY_THRESHOLD_ABSOLUTE = 5_000;
export const DEFAULT_CONFIDENCE_THRESHOLD = 0.80;

export const DEFAULT_MONTE_CARLO_RUNS = 10_000;

export const GUARDRAIL_PORTFOLIO_CEILING_MULTIPLIER = 20;
export const GUARDRAIL_MAX_WITHDRAWAL_RATE_PCT = 6;

// Tax computation constants (2025 tax year)
export const SS_WAGE_BASE = 176_100;
export const NIIT_RATE = 0.038;
export const NIIT_THRESHOLD_MFJ = 250_000;
export const NIIT_THRESHOLD_SINGLE = 200_000;
export const ADDITIONAL_MEDICARE_RATE = 0.009;
export const ADDITIONAL_MEDICARE_THRESHOLD_MFJ = 250_000;
export const ADDITIONAL_MEDICARE_THRESHOLD_SINGLE = 200_000;
export const CAPITAL_LOSS_DEDUCTION_CAP = 3_000;
export const SE_TAX_SS_RATE = 0.124;
export const SE_TAX_MEDICARE_RATE = 0.029;
export const SE_INCOME_ADJUSTMENT = 0.9235;
