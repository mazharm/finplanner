import type { FilingStatus } from '@finplanner/domain';
import { SS_PROVISIONAL_INCOME_THRESHOLDS } from '@finplanner/domain';

export function computeTaxableSS(
  ssIncome: number,
  otherTaxableIncome: number,
  filingStatus: FilingStatus
): number {
  if (ssIncome <= 0) return 0;
  const provisionalIncome = otherTaxableIncome + 0.5 * ssIncome;
  const thresholds = SS_PROVISIONAL_INCOME_THRESHOLDS[filingStatus] ?? SS_PROVISIONAL_INCOME_THRESHOLDS.single;
  if (provisionalIncome <= thresholds.lower) return 0;
  if (provisionalIncome <= thresholds.upper) {
    return Math.min(0.50 * ssIncome, 0.50 * (provisionalIncome - thresholds.lower));
  }
  return Math.min(0.85 * ssIncome, 0.85 * (provisionalIncome - thresholds.upper) + 0.50 * (thresholds.upper - thresholds.lower));
}
