import type { PlanInput, PlanResult, YearResult } from '@finplanner/domain';
import { DEFAULT_FEDERAL_EFFECTIVE_RATE_PCT, DEFAULT_CAP_GAINS_RATE_PCT } from '@finplanner/domain';
import { validatePlanInput } from '@finplanner/validation';
import type { SimulationState, AccountState } from './types.js';
import { computeBaselineReturn } from './helpers/scenario-returns.js';
import { iterateUntilConverged } from './helpers/convergence.js';
import { getInflationRate } from './helpers/inflation.js';

// Steps
import { determinePhase } from './steps/01-determine-phase.js';
import { applyReturns } from './steps/02-apply-returns.js';
import { computeMandatoryIncome } from './steps/03-mandatory-income.js';
import { inflateDeduction } from './steps/04-inflate-deduction.js';
import { computeRmds } from './steps/05-compute-rmds.js';
import { inflateSpending } from './steps/06-inflate-spending.js';
import { computeWithdrawalTarget } from './steps/07-withdrawal-target.js';
import { solveWithdrawals } from './steps/08-solve-withdrawals.js';
import { calculateTaxes } from './steps/09-calculate-taxes.js';
import { computeNetSpendable } from './steps/10-net-spendable.js';
import { applyFees } from './steps/11-apply-fees.js';
import { rebalance } from './steps/12-rebalance.js';
import type { RebalanceResult } from './steps/12-rebalance.js';
import { produceYearResult } from './steps/13-produce-result.js';

/**
 * Base calendar year for the simulation.
 * Hardcoded for testing consistency.
 */
const BASE_CALENDAR_YEAR = 2026;

/**
 * Heuristic: ~50% of spending comes from taxable sources.
 * Used for the initial tax estimate in year 1 (when no prior year data exists).
 */
const INITIAL_TAX_ESTIMATE_FRACTION = 0.5;

/**
 * Main simulation entry point.
 *
 * Runs a deterministic year-by-year retirement simulation over the
 * full planning horizon. Returns yearly results and a summary.
 *
 * This is a pure synchronous function: simulate(planInput) -> PlanResult
 */
export function simulate(planInput: PlanInput): PlanResult {
  // 1. Validate input
  const validation = validatePlanInput(planInput);
  if (!validation.valid) {
    throw new Error(`Invalid plan input: ${validation.errors.join('; ')}`);
  }

  // 2. Initialize simulation state
  const state = initializeState(planInput);

  // 3. Compute simulation horizon
  const horizon = computeHorizon(planInput);

  // 4. Year loop
  const yearlyResults: YearResult[] = [];
  for (let yearIndex = 0; yearIndex < horizon; yearIndex++) {
    state.yearIndex = yearIndex;
    state.currentYear = BASE_CALENDAR_YEAR + yearIndex;

    // Build cumulative inflation incrementally: O(1) per year instead of O(n)
    if (yearIndex === 0) {
      state.cumulativeInflationByYear[0] = 1;
    } else {
      const prevMultiplier = state.cumulativeInflationByYear[yearIndex - 1];
      const rate = getInflationRate(yearIndex - 1, state.plan, state.scenarioInflation);
      state.cumulativeInflationByYear[yearIndex] = prevMultiplier * (1 + rate / 100);
    }

    // Recompute baseline return each year (weights change as balances change)
    state.baselineReturn = computeBaselineReturn(state.accounts);

    const yearResult = simulateYear(state);
    yearlyResults.push(yearResult);
  }

  // 5. Assemble result
  return assemblePlanResult(yearlyResults, planInput);
}

/**
 * Initialize simulation state from plan input.
 */
function initializeState(planInput: PlanInput): SimulationState {
  const accounts: AccountState[] = planInput.accounts.map(account => ({
    id: account.id,
    type: account.type,
    owner: account.owner,
    balance: account.currentBalance,
    costBasis: account.costBasis ?? account.currentBalance,
    expectedReturnPct: account.expectedReturnPct,
    feePct: account.feePct,
    targetAllocationPct: account.targetAllocationPct,
    deferredCompSchedule: account.deferredCompSchedule,
  }));

  // Determine scenario returns/inflation if applicable
  let scenarioReturns: number[] | undefined;
  let scenarioInflation: number[] | undefined;

  // Note: In the full implementation, historical/stress scenarios would be
  // loaded from @finplanner/scenarios. For deterministic mode, these are undefined.
  // The scenario loading is handled by the caller (e.g., Monte Carlo runner).

  return {
    accounts,
    plan: planInput,
    currentYear: BASE_CALENDAR_YEAR,
    yearIndex: 0,
    priorYearTotalTaxDollars: 0,
    priorYearRebalanceGains: 0,
    scenarioReturns,
    scenarioInflation,
    baselineReturn: computeBaselineReturn(accounts),
    survivorTransitioned: false,
    firstSurvivorYearIndex: -1,
    cumulativeInflationByYear: [1],
  };
}

/**
 * Compute the simulation horizon in years.
 * Takes the maximum of primary and spouse life expectancy remaining years.
 * Throws if the horizon is zero or negative (age >= life expectancy).
 */
function computeHorizon(planInput: PlanInput): number {
  const { primary, spouse } = planInput.household;
  const primaryYears = primary.lifeExpectancy - primary.currentAge;

  let spouseYears = 0;
  if (spouse) {
    spouseYears = spouse.lifeExpectancy - spouse.currentAge;
  }

  const horizon = Math.max(primaryYears, spouseYears);
  if (horizon <= 0) {
    throw new Error(
      `Invalid simulation horizon: ${horizon} years. ` +
      `Primary age ${primary.currentAge} >= life expectancy ${primary.lifeExpectancy}` +
      (spouse ? `, Spouse age ${spouse.currentAge} >= life expectancy ${spouse.lifeExpectancy}` : '')
    );
  }
  return horizon;
}

/**
 * Simulate a single year, executing all 13 steps.
 *
 * Steps 7-9 are wrapped in a convergence loop because withdrawals
 * depend on estimated taxes, but actual taxes depend on withdrawals.
 */
function simulateYear(state: SimulationState): YearResult {
  const { plan } = state;

  // Step 1: Determine phase (joint vs survivor), ages, filing status
  const yearContext = determinePhase(state);

  // Snapshot prior year-end balances for RMD computation (IRS uses Dec 31 balance)
  const priorYearEndBalances = new Map<string, number>();
  for (const a of state.accounts) {
    if (a.type === 'taxDeferred') {
      priorYearEndBalances.set(a.id, a.balance);
    }
  }

  // Step 2: Apply beginning-of-year investment returns
  applyReturns(state);

  // Step 3: Compute mandatory income (SS, NQDC, pensions, adjustments)
  const mandatoryIncome = computeMandatoryIncome(state, yearContext);

  // Step 4: Inflate standard deduction
  const standardDeduction = inflateDeduction(state, yearContext);

  // Step 5: Compute and distribute RMDs (using prior year-end balance per IRS rules)
  const rmdResult = computeRmds(state, yearContext, priorYearEndBalances);

  // Step 6: Inflate spending target, apply guardrails
  const spending = inflateSpending(state, yearContext);

  // Snapshot account balances before the convergence loop
  // (steps 7-9 may iterate and we need to restore state between iterations)
  const accountSnapshots = snapshotAccounts(state.accounts);

  // Determine tax rates for the convergence loop
  const federalEffectiveRate =
    plan.taxes.federalEffectiveRatePct ?? DEFAULT_FEDERAL_EFFECTIVE_RATE_PCT;
  const capGainsRate =
    plan.taxes.capGainsRatePct ?? DEFAULT_CAP_GAINS_RATE_PCT;

  // Initial tax estimate: use prior year's total tax dollars or a rough estimate
  const initialTaxEstimate = state.priorYearTotalTaxDollars > 0
    ? state.priorYearTotalTaxDollars
    : spending.actualSpend * (federalEffectiveRate / 100) * INITIAL_TAX_ESTIMATE_FRACTION;

  // Steps 7-9: Convergence loop
  const convergenceResult = iterateUntilConverged(
    (estimatedTaxes: number) => {
      // Restore account balances to pre-withdrawal state
      restoreAccounts(state.accounts, accountSnapshots);

      // Step 7: Compute withdrawal target
      const withdrawalTarget = computeWithdrawalTarget(
        spending.actualSpend,
        estimatedTaxes,
        mandatoryIncome,
        rmdResult
      );

      // Step 8: Solve withdrawals from accounts
      const withdrawalResult = solveWithdrawals(
        state.accounts,
        withdrawalTarget,
        plan.strategy.withdrawalOrder,
        mandatoryIncome.totalMandatoryTaxableOrdinary + rmdResult.rmdTotal,
        standardDeduction,
        federalEffectiveRate,
        capGainsRate
      );

      // Step 9: Calculate taxes
      // Include prior year's rebalance gains as additional capital gains
      const taxResult = calculateTaxes(
        plan,
        mandatoryIncome,
        rmdResult.rmdTotal,
        withdrawalResult.taxableOrdinaryFromWithdrawals,
        withdrawalResult.taxableCapGainsFromWithdrawals + state.priorYearRebalanceGains,
        standardDeduction,
        yearContext.filingStatus
      );

      return {
        result: { withdrawalResult, taxResult },
        actualTaxes: taxResult.taxesFederal + taxResult.taxesState,
      };
    },
    initialTaxEstimate
  );

  const { withdrawalResult, taxResult } = convergenceResult.result;

  if (!convergenceResult.converged) {
    // Log warning - convergence failed, using last iteration's result
    console.warn(
      `[FinPlanner] Tax-withdrawal convergence did not converge in year ${state.currentYear} ` +
      `after ${convergenceResult.iterations} iterations. Results may be approximate.`
    );
  }

  // Store this year's total tax dollars for next year's initial convergence estimate
  const totalIncome =
    mandatoryIncome.socialSecurityIncome +
    mandatoryIncome.nqdcDistributions +
    mandatoryIncome.pensionAndOtherIncome +
    mandatoryIncome.adjustmentIncome +
    rmdResult.rmdTotal +
    withdrawalResult.totalWithdrawn;

  state.priorYearTotalTaxDollars = totalIncome > 0
    ? (taxResult.taxesFederal + taxResult.taxesState)
    : 0;

  // Step 10: Compute net spendable, shortfall, surplus
  const netSpendableResult = computeNetSpendable(
    spending.actualSpend,
    mandatoryIncome,
    rmdResult,
    withdrawalResult,
    taxResult,
    state.accounts
  );

  // Step 11: Apply management fees
  applyFees(state.accounts);

  // Step 12: Rebalance portfolio
  const rebalanceResult: RebalanceResult = rebalance(state.accounts, plan.strategy.rebalanceFrequency);

  // Store rebalance gains for inclusion in next year's tax calculation
  // (rebalancing happens after this year's tax computation)
  state.priorYearRebalanceGains = rebalanceResult.realizedCapitalGains;

  // Step 13: Produce year result
  return produceYearResult(
    yearContext,
    spending,
    mandatoryIncome,
    rmdResult,
    withdrawalResult,
    taxResult,
    netSpendableResult,
    state.accounts
  );
}

/**
 * Create a snapshot of account balances and cost bases for restoration
 * during the convergence loop.
 */
function snapshotAccounts(
  accounts: AccountState[]
): Array<{ balance: number; costBasis: number }> {
  return accounts.map(a => ({
    balance: a.balance,
    costBasis: a.costBasis,
  }));
}

/**
 * Restore account balances and cost bases from a snapshot.
 */
function restoreAccounts(
  accounts: AccountState[],
  snapshots: Array<{ balance: number; costBasis: number }>
): void {
  for (let i = 0; i < accounts.length; i++) {
    accounts[i].balance = snapshots[i].balance;
    accounts[i].costBasis = snapshots[i].costBasis;
  }
}

/**
 * Assemble the final PlanResult from yearly results.
 */
function assemblePlanResult(
  yearlyResults: YearResult[],
  planInput: PlanInput
): PlanResult {
  // Compute summary statistics
  const lastYear = yearlyResults[yearlyResults.length - 1];
  const totalTerminalValue = lastYear
    ? Object.values(lastYear.endBalanceByAccount).reduce((sum, v) => sum + v, 0)
    : 0;

  const totalShortfall = yearlyResults.reduce((sum, yr) => sum + yr.shortfall, 0);

  // For deterministic mode, success probability is binary: 1.0 if no shortfall, 0 otherwise
  const hasShortfall = yearlyResults.some(yr => yr.shortfall > 0);

  return {
    summary: {
      successProbability: hasShortfall ? 0 : 1.0,
      medianTerminalValue: totalTerminalValue,
      worstCaseShortfall: totalShortfall > 0 ? totalShortfall : undefined,
    },
    yearly: yearlyResults,
    assumptionsUsed: {
      simulationMode: planInput.market.simulationMode,
      inflationPct: planInput.spending.inflationPct,
      federalEffectiveRatePct: planInput.taxes.federalEffectiveRatePct ?? DEFAULT_FEDERAL_EFFECTIVE_RATE_PCT,
      capGainsRatePct: planInput.taxes.capGainsRatePct ?? DEFAULT_CAP_GAINS_RATE_PCT,
      withdrawalOrder: planInput.strategy.withdrawalOrder,
      rebalanceFrequency: planInput.strategy.rebalanceFrequency,
      guardrailsEnabled: planInput.strategy.guardrailsEnabled,
      horizon: yearlyResults.length,
      baseCalendarYear: BASE_CALENDAR_YEAR,
    },
  };
}
