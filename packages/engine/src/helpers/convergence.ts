import { WITHDRAWAL_CONVERGENCE_THRESHOLD, MAX_ITERATIONS } from '@finplanner/domain';

export interface ConvergenceResult<T> {
  result: T;
  converged: boolean;
  iterations: number;
}

/**
 * Iterative convergence loop for the tax-withdrawal circular dependency.
 *
 * The problem: withdrawals depend on estimated taxes (to gross up),
 * but actual taxes depend on the withdrawals made. This function
 * iterates until the estimated and actual taxes converge within
 * the threshold (default $100).
 *
 * @param computeFn - Given an estimated tax amount, computes the withdrawal
 *   result and the actual taxes that would result.
 * @param initialTaxEstimate - Starting estimate for taxes (typically
 *   prior year's effective rate applied to expected income).
 */
export function iterateUntilConverged<T>(
  computeFn: (estimatedTaxes: number) => { result: T; actualTaxes: number },
  initialTaxEstimate: number
): ConvergenceResult<T> {
  let taxEstimate = initialTaxEstimate;
  let lastResult: T | undefined;
  let actualTaxes = 0;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const outcome = computeFn(taxEstimate);
    lastResult = outcome.result;
    actualTaxes = outcome.actualTaxes;

    if (Math.abs(actualTaxes - taxEstimate) < WITHDRAWAL_CONVERGENCE_THRESHOLD) {
      return { result: lastResult, converged: true, iterations: i + 1 };
    }
    taxEstimate = actualTaxes;
  }

  return { result: lastResult as T, converged: false, iterations: MAX_ITERATIONS };
}
