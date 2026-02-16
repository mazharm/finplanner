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

  // 'survivor' uses the same thresholds as 'mfj' for the first 2 years,
  // then transitions to 'single'. The filing status passed in already
  // reflects the correct status for the year.
  const thresholds = filingStatus === 'single'
    ? SS_PROVISIONAL_INCOME_THRESHOLDS.single
    : SS_PROVISIONAL_INCOME_THRESHOLDS.mfj;

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
    0.85 * (provisionalIncome - thresholds.upper) + thresholds.midBandCap
  );
}
