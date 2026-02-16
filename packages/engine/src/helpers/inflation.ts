import type { PlanInput } from '@finplanner/domain';

/**
 * Get the inflation rate for a given year index.
 * In historical/stress scenarios, uses the scenario inflation sequence.
 * Otherwise, uses the plan's constant inflation rate.
 */
export function getInflationRate(
  yearIndex: number,
  plan: PlanInput,
  scenarioInflation?: number[]
): number {
  if (scenarioInflation && yearIndex < scenarioInflation.length) {
    return scenarioInflation[yearIndex];
  }
  return plan.spending.inflationPct;
}

/**
 * Compute cumulative inflation from year 0 to the given year index.
 * Returns a multiplier (e.g. 1.0 at yearIndex 0, ~1.03 at yearIndex 1
 * with 3% inflation).
 *
 * @deprecated Prefer getCumulativeInflationCached for O(1) lookup using
 * the precomputed array on SimulationState.
 */
export function getCumulativeInflation(
  yearIndex: number,
  plan: PlanInput,
  scenarioInflation?: number[]
): number {
  let cumulative = 1;
  for (let i = 0; i < yearIndex; i++) {
    const rate = getInflationRate(i, plan, scenarioInflation);
    cumulative *= (1 + rate / 100);
  }
  return cumulative;
}

/**
 * O(1) lookup of cumulative inflation using the precomputed array
 * built incrementally during the simulation loop.
 *
 * cumulativeInflationByYear[i] = product of (1 + rate_j/100) for j in 0..i-1.
 * Falls back to getCumulativeInflation if the array doesn't cover the requested index.
 */
export function getCumulativeInflationCached(
  yearIndex: number,
  cumulativeInflationByYear: number[],
  plan: PlanInput,
  scenarioInflation?: number[]
): number {
  if (yearIndex < cumulativeInflationByYear.length) {
    return cumulativeInflationByYear[yearIndex];
  }
  // Fallback for safety (should not happen in normal simulation flow)
  return getCumulativeInflation(yearIndex, plan, scenarioInflation);
}
