/** Round to cents for consistent precision in all cost-basis operations. */
function roundCents(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Compute the fraction of a taxable account balance that is gain (vs. cost basis).
 * Used to determine the taxable portion of withdrawals from taxable accounts.
 */
export function computeGainFraction(balance: number, costBasis: number): number {
  if (balance <= 0) return 0;
  return Math.min(1, Math.max(0, (balance - costBasis) / balance));
}

/**
 * Compute the taxable capital gain from a withdrawal given the gain fraction.
 */
export function computeTaxableGain(withdrawalAmount: number, gainFraction: number): number {
  return roundCents(withdrawalAmount * gainFraction);
}

/**
 * Reduce cost basis after a withdrawal.
 * The cost basis portion of the withdrawal is (1 - gainFraction) * withdrawalAmount.
 */
export function reduceBasis(costBasis: number, withdrawalAmount: number, gainFraction: number): number {
  return Math.max(0, roundCents(costBasis - withdrawalAmount * (1 - gainFraction)));
}
