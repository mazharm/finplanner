import type { MandatoryIncome, RmdResult } from '../types.js';

/**
 * Step 7: Compute Withdrawal Target
 *
 * Determines how much additional money needs to be withdrawn from
 * investment accounts to meet the spending target, after accounting
 * for mandatory income sources and RMDs already distributed.
 *
 * withdrawalTarget = actualSpend + estimatedTaxes
 *                    - socialSecurityIncome
 *                    - nqdcDistributions
 *                    - pensionAndOtherIncome
 *                    - adjustmentIncome
 *                    - rmdTotal (already withdrawn)
 *
 * If the result is negative (mandatory income exceeds spending + taxes),
 * the target is floored at 0 (no additional withdrawals needed).
 */
export function computeWithdrawalTarget(
  actualSpend: number,
  estimatedTaxes: number,
  mandatoryIncome: MandatoryIncome,
  rmdResult: RmdResult
): number {
  const target =
    actualSpend +
    estimatedTaxes -
    mandatoryIncome.socialSecurityIncome -
    mandatoryIncome.nqdcDistributions -
    mandatoryIncome.pensionAndOtherIncome -
    mandatoryIncome.adjustmentIncome -
    rmdResult.rmdTotal;

  return Math.max(0, target);
}
