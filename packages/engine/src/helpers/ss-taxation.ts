import type { FilingStatus } from '@finplanner/domain';
import { SS_PROVISIONAL_INCOME_THRESHOLDS } from '@finplanner/domain';

/**
 * Compute the taxable portion of Social Security benefits using the
 * IRS provisional income method.
 *
 * Provisional income = other taxable income + 0.5 * SS income
 *
 * Below lower threshold: 0% taxable
 * Between lower and upper: up to 50% taxable
 * Above upper: up to 85% taxable
 */
export function computeTaxableSS(
  ssIncome: number,
  otherTaxableIncome: number,
  filingStatus: FilingStatus
): number {
  if (ssIncome <= 0) return 0;

  const provisionalIncome = otherTaxableIncome + 0.5 * ssIncome;

  // Use direct filingStatus lookup so that 'survivor' maps to its own thresholds
  // (which match 'mfj' for the first 2 years; after that the caller transitions
  // filingStatus to 'single'). Falls back to 'single' (more conservative) for
  // any unrecognized status, consistent with tax/computation module.
  const thresholds = SS_PROVISIONAL_INCOME_THRESHOLDS[filingStatus as keyof typeof SS_PROVISIONAL_INCOME_THRESHOLDS]
    ?? SS_PROVISIONAL_INCOME_THRESHOLDS.single;

  if (provisionalIncome <= thresholds.lower) {
    return 0;
  }

  if (provisionalIncome <= thresholds.upper) {
    return Math.min(
      0.50 * ssIncome,
      0.50 * (provisionalIncome - thresholds.lower)
    );
  }

  // Above upper threshold: up to 85% of SS is taxable
  return Math.min(
    0.85 * ssIncome,
    0.85 * (provisionalIncome - thresholds.upper) + 0.50 * (thresholds.upper - thresholds.lower)
  );
}
