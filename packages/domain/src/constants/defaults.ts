export const DEFAULT_FEDERAL_EFFECTIVE_RATE_PCT = 22;
export const DEFAULT_CAP_GAINS_RATE_PCT = 15;

export const STANDARD_DEDUCTIONS = {
  single: 15_000,
  mfj: 30_000,
  survivor: 30_000,
} as const;

export const EXTRA_DEDUCTION_SINGLE_65_PLUS = 1_550;
export const EXTRA_DEDUCTION_MFJ_65_PLUS_PER_PERSON = 1_300;

export const SS_PROVISIONAL_INCOME_THRESHOLDS = {
  mfj: { lower: 32_000, upper: 44_000, midBandCap: 6_000 },
  survivor: { lower: 32_000, upper: 44_000, midBandCap: 6_000 },
  single: { lower: 25_000, upper: 34_000, midBandCap: 4_500 },
} as const;

export const WITHDRAWAL_CONVERGENCE_THRESHOLD = 100;
export const MAX_ITERATIONS = 5;

export const DEFAULT_ANOMALY_THRESHOLD_PCT = 25;
export const DEFAULT_ANOMALY_THRESHOLD_ABSOLUTE = 5_000;
export const DEFAULT_CONFIDENCE_THRESHOLD = 0.80;

export const DEFAULT_MONTE_CARLO_RUNS = 10_000;

export const GUARDRAIL_PORTFOLIO_CEILING_MULTIPLIER = 20;
export const GUARDRAIL_MAX_WITHDRAWAL_RATE_PCT = 6;
