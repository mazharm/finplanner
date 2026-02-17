import {
  GUARDRAIL_PORTFOLIO_CEILING_MULTIPLIER,
  GUARDRAIL_MAX_WITHDRAWAL_RATE_PCT,
} from '@finplanner/domain';
import type { SimulationState, YearContext, SpendingResult, AccountState } from '../types.js';
import { getCumulativeInflationCached } from '../helpers/inflation.js';

/**
 * Step 6: Inflate Spending Target
 *
 * Computes the target and actual spending for the year:
 * 1. Inflate base spending by cumulative inflation
 * 2. Apply survivor spending adjustment if in survivor phase
 * 3. Apply guardrail rules if enabled (ceiling/floor clamps)
 */
export function inflateSpending(
  state: SimulationState,
  yearContext: YearContext
): SpendingResult {
  const { plan, yearIndex, scenarioInflation } = state;
  const { isSurvivorPhase, bothDead } = yearContext;

  // No spending after all parties have died
  if (bothDead) {
    return { targetSpend: 0, actualSpend: 0 };
  }

  // Step 1: Base target inflated from year 1 — O(1) cached lookup
  const inflationMultiplier = getCumulativeInflationCached(
    yearIndex, state.cumulativeInflationByYear, plan, scenarioInflation
  );
  let targetSpend = plan.spending.targetAnnualSpend * inflationMultiplier;

  // Step 2: Survivor spending adjustment
  if (isSurvivorPhase) {
    targetSpend *= plan.spending.survivorSpendingAdjustmentPct / 100;
  }

  // Step 3: Guardrails
  let actualSpend = targetSpend;

  if (plan.strategy.guardrailsEnabled) {
    actualSpend = applyGuardrails(
      targetSpend,
      state.accounts,
      inflationMultiplier,
      plan.spending.ceilingAnnualSpend,
      plan.spending.floorAnnualSpend
    );
  }

  return { targetSpend, actualSpend };
}

/**
 * Apply guardrail spending rules.
 *
 * Ceiling check: if portfolio > CEILING_MULTIPLIER * ceiling (inflation-adjusted),
 *   cap spending at the ceiling.
 * Floor check: if spending / portfolio > MAX_WITHDRAWAL_RATE_PCT%,
 *   floor spending at the floor.
 */
function applyGuardrails(
  targetSpend: number,
  accounts: AccountState[],
  inflationMultiplier: number,
  ceiling?: number,
  floor?: number
): number {
  const totalPortfolio = accounts.reduce((sum, a) => sum + a.balance, 0);

  // Ceiling rule (Guyton-Klinger): when portfolio is very large (> CEILING_MULTIPLIER * ceiling),
  // the portfolio has grown significantly, so we raise spending up to the ceiling level.
  // Use Math.max to ensure spending only goes UP (or stays same) — never decreases from this rule.
  if (ceiling !== undefined && ceiling > 0) {
    const inflatedCeiling = ceiling * inflationMultiplier;
    if (totalPortfolio > GUARDRAIL_PORTFOLIO_CEILING_MULTIPLIER * inflatedCeiling) {
      return Math.max(targetSpend, inflatedCeiling);
    }
  }

  // Floor rule: if withdrawal rate would exceed max, clamp to floor
  if (floor !== undefined && floor > 0 && totalPortfolio > 0) {
    const inflatedFloor = floor * inflationMultiplier;
    const withdrawalRate = (targetSpend / totalPortfolio) * 100;
    if (withdrawalRate > GUARDRAIL_MAX_WITHDRAWAL_RATE_PCT) {
      return Math.max(inflatedFloor, Math.min(targetSpend, totalPortfolio * GUARDRAIL_MAX_WITHDRAWAL_RATE_PCT / 100));
    }
  }

  return targetSpend;
}
