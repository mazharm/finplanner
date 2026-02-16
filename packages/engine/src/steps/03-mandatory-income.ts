import type { PlanInput, PersonProfile } from '@finplanner/domain';
import type { SimulationState, AccountState, YearContext, MandatoryIncome } from '../types.js';
import { getInflationRate } from '../helpers/inflation.js';

/**
 * Step 3: Compute Mandatory Income
 *
 * Calculates all income that arrives regardless of withdrawal decisions:
 * - Social Security benefits
 * - NQDC (deferred compensation) distributions
 * - Pensions and other income streams
 * - One-time or recurring adjustments
 */
export function computeMandatoryIncome(
  state: SimulationState,
  yearContext: YearContext
): MandatoryIncome {
  const { plan, yearIndex, scenarioInflation } = state;
  const { calendarYear, primaryAlive, spouseAlive, isSurvivorPhase } = yearContext;

  let socialSecurityIncome = 0;
  let nqdcDistributions = 0;
  let pensionAndOtherIncome = 0;
  let adjustmentIncome = 0;
  let totalMandatoryTaxableOrdinary = 0;
  let totalMandatoryTaxableCapGains = 0;

  const cumulativeInflation = state.cumulativeInflationByYear;

  // --- Social Security ---
  socialSecurityIncome = computeSocialSecurity(plan, yearContext, yearIndex, scenarioInflation, cumulativeInflation);

  // --- NQDC distributions ---
  nqdcDistributions = computeNqdcDistributions(state, yearContext);

  // --- Pensions and other income streams ---
  const incomeResult = computeIncomeStreams(plan, yearContext, yearIndex, scenarioInflation, cumulativeInflation);
  pensionAndOtherIncome = incomeResult.totalIncome;
  totalMandatoryTaxableOrdinary += incomeResult.taxableOrdinary;

  // --- Adjustments ---
  const adjResult = computeAdjustments(plan, yearContext, yearIndex, scenarioInflation, cumulativeInflation);
  adjustmentIncome = adjResult.totalAmount;
  totalMandatoryTaxableOrdinary += adjResult.taxableAmount;

  // SS and NQDC are ordinary income
  totalMandatoryTaxableOrdinary += socialSecurityIncome; // Note: actual taxable SS is computed in step 9
  totalMandatoryTaxableOrdinary += nqdcDistributions;

  return {
    socialSecurityIncome,
    nqdcDistributions,
    pensionAndOtherIncome,
    adjustmentIncome,
    totalMandatoryTaxableOrdinary,
    totalMandatoryTaxableCapGains,
  };
}

/**
 * Compute Social Security benefits for the current year.
 */
function computeSocialSecurity(
  plan: PlanInput,
  yearContext: YearContext,
  yearIndex: number,
  scenarioInflation?: number[],
  cumulativeInflation?: number[]
): number {
  const { household } = plan;
  const { calendarYear, primaryAlive, spouseAlive, isSurvivorPhase, survivorId } = yearContext;

  let primarySS = 0;
  let spouseSS = 0;

  // Compute primary SS
  if (primaryAlive && household.primary.socialSecurity) {
    primarySS = computePersonSS(
      household.primary,
      calendarYear,
      yearIndex,
      plan,
      scenarioInflation,
      cumulativeInflation
    );
  }

  // Compute spouse SS
  if (spouseAlive && household.spouse?.socialSecurity) {
    spouseSS = computePersonSS(
      household.spouse,
      calendarYear,
      yearIndex,
      plan,
      scenarioInflation,
      cumulativeInflation
    );
  }

  // In survivor phase: survivor gets max(own benefit, deceased's benefit)
  if (isSurvivorPhase && survivorId) {
    const deceasedProfile = survivorId === 'primary' ? household.spouse : household.primary;
    const survivorProfile = survivorId === 'primary' ? household.primary : household.spouse;

    if (deceasedProfile?.socialSecurity && survivorProfile?.socialSecurity) {
      const deceasedBenefit = computePersonSS(
        deceasedProfile,
        calendarYear,
        yearIndex,
        plan,
        scenarioInflation,
        cumulativeInflation
      );
      const survivorOwnBenefit = survivorId === 'primary' ? primarySS : spouseSS;

      return Math.max(survivorOwnBenefit, deceasedBenefit);
    }

    // If only one had SS, return whichever applies
    if (survivorId === 'primary') return primarySS;
    return spouseSS;
  }

  return primarySS + spouseSS;
}

/**
 * Compute SS benefit for a single person in a given year.
 * Grows the benefit by COLA from the claim year forward.
 * In scenario modes, scenario inflation replaces the person's colaPct for COLA.
 *
 * Optimized from O(yearsSinceClaim) per call to O(1) using:
 * - Math.pow for constant-rate (non-scenario) years
 * - Precomputed cumulative inflation prefix products for scenario years
 */
function computePersonSS(
  person: PersonProfile,
  calendarYear: number,
  yearIndex: number,
  plan: PlanInput,
  scenarioInflation?: number[],
  cumulativeInflation?: number[]
): number {
  const ss = person.socialSecurity;
  if (!ss) return 0;

  const claimYear = person.birthYear + ss.claimAge;
  if (calendarYear < claimYear) return 0;

  const baseBenefit = ss.estimatedMonthlyBenefitAtClaim * 12;

  // Years since claiming started
  const yearsSinceClaim = calendarYear - claimYear;
  if (yearsSinceClaim === 0) return baseBenefit;

  const claimYearIndex = yearIndex - yearsSinceClaim;

  // If no scenario inflation, all years use the constant colaPct — O(1) via Math.pow
  if (!scenarioInflation) {
    return baseBenefit * Math.pow(1 + ss.colaPct / 100, yearsSinceClaim);
  }

  // With scenario inflation, we may have a mix:
  //   - Pre-simulation years (claimYearIndex < 0): use constant colaPct
  //   - In-simulation years (0 <= idx < scenarioInflation.length): use scenario rates
  //   - Beyond scenario array: use constant colaPct

  let multiplier = 1;

  // Phase 1: Pre-simulation constant-rate years (claimYearIndex < 0)
  const preSimYears = Math.max(0, -claimYearIndex);
  if (preSimYears > 0) {
    const yearsAtConstant = Math.min(preSimYears, yearsSinceClaim);
    multiplier *= Math.pow(1 + ss.colaPct / 100, yearsAtConstant);
  }

  // Phase 2: In-simulation scenario years — use cumulative inflation ratio
  const scenarioStart = Math.max(0, claimYearIndex);
  const scenarioEnd = Math.min(yearIndex, scenarioInflation.length);

  if (scenarioEnd > scenarioStart && cumulativeInflation &&
      scenarioEnd < cumulativeInflation.length && scenarioStart < cumulativeInflation.length) {
    // Ratio of prefix products gives compound growth over the range
    multiplier *= cumulativeInflation[scenarioEnd] / cumulativeInflation[scenarioStart];
  }

  // Phase 3: Post-scenario constant-rate years (beyond scenarioInflation array)
  if (yearIndex > scenarioInflation.length) {
    const postScenarioYears = yearIndex - Math.max(scenarioStart, scenarioInflation.length);
    if (postScenarioYears > 0) {
      multiplier *= Math.pow(1 + ss.colaPct / 100, postScenarioYears);
    }
  }

  return baseBenefit * multiplier;
}

/**
 * Compute NQDC (deferred compensation) distributions.
 * For deferredComp accounts with schedules, check if the current year
 * falls within the distribution window.
 *
 * Optimized: uses precomputed cumulative inflation for O(1) inflation
 * lookup instead of O(yearsSinceStart) loop per year.
 */
function computeNqdcDistributions(
  state: SimulationState,
  yearContext: YearContext
): number {
  const { accounts, plan, yearIndex, scenarioInflation } = state;
  const cumulativeInflation = state.cumulativeInflationByYear;
  const { calendarYear } = yearContext;

  let total = 0;

  for (const account of accounts) {
    if (account.type !== 'deferredComp' || !account.deferredCompSchedule) continue;
    if (account.balance <= 0) continue;

    const schedule = account.deferredCompSchedule;
    const { startYear, endYear, frequency, amount, inflationAdjusted } = schedule;

    if (calendarYear < startYear) continue;

    // Lump sum of remaining balance after the scheduled window ends
    if (calendarYear > endYear) {
      if (account.balance > 0) {
        total += account.balance;
        account.balance = 0;
      }
      continue;
    }

    // Within the distribution window
    if (calendarYear >= startYear && calendarYear <= endYear) {
      let distributionAmount = frequency === 'monthly' ? amount * 12 : amount;

      // Inflate if configured — O(1) using cumulative inflation prefix products
      if (inflationAdjusted) {
        const yearsSinceStart = calendarYear - startYear;
        if (yearsSinceStart > 0) {
          const inflationMultiplier = computeInflationMultiplierForRange(
            yearIndex - yearsSinceStart, yearIndex, plan, scenarioInflation, cumulativeInflation
          );
          distributionAmount *= inflationMultiplier;
        }
      }

      // Cap at remaining balance
      distributionAmount = Math.min(distributionAmount, account.balance);
      account.balance -= distributionAmount;
      total += distributionAmount;
    }
  }

  return total;
}

/**
 * Compute income from pensions and other income streams.
 *
 * Optimized: uses Math.pow for constant-rate COLA and precomputed
 * cumulative inflation prefix products for scenario COLA, reducing
 * from O(yearsSinceStart) per stream per year to O(1).
 */
function computeIncomeStreams(
  plan: PlanInput,
  yearContext: YearContext,
  yearIndex: number,
  scenarioInflation?: number[],
  cumulativeInflation?: number[]
): { totalIncome: number; taxableOrdinary: number } {
  const { calendarYear, primaryAlive, spouseAlive, isSurvivorPhase, survivorId } = yearContext;

  let totalIncome = 0;
  let taxableOrdinary = 0;

  for (const stream of plan.otherIncome) {
    // Check if stream is active this year
    if (calendarYear < stream.startYear) continue;
    if (stream.endYear !== undefined && calendarYear > stream.endYear) continue;

    // Check if owner is alive (or survivor continues)
    const ownerAlive = isOwnerAlive(stream.owner, primaryAlive, spouseAlive);
    if (!ownerAlive) {
      if (isSurvivorPhase && stream.survivorContinues) {
        // Stream continues for survivor
      } else {
        continue;
      }
    }

    // Compute amount with COLA growth
    const yearsSinceStart = calendarYear - stream.startYear;
    let amount = stream.annualAmount;

    if (yearsSinceStart > 0 && stream.colaPct !== undefined && stream.colaPct !== 0) {
      const colaPct = stream.colaPct ?? 0;
      const startIdx = yearIndex - yearsSinceStart;

      // If no scenario inflation, all years use constant colaPct — O(1)
      if (!scenarioInflation) {
        amount *= Math.pow(1 + colaPct / 100, yearsSinceStart);
      } else {
        // Mixed: pre-sim constant, in-sim scenario, post-sim constant
        amount *= computeColaMultiplierForRange(
          startIdx, yearIndex, colaPct, scenarioInflation, cumulativeInflation
        );
      }
    }

    totalIncome += amount;
    if (stream.taxable) {
      taxableOrdinary += amount;
    }
  }

  return { totalIncome, taxableOrdinary };
}

/**
 * Compute adjustments (one-time or multi-year income/expense modifications).
 *
 * Optimized: uses precomputed cumulative inflation for O(1) inflation
 * lookup instead of O(yearsSinceStart) loop per year.
 */
function computeAdjustments(
  plan: PlanInput,
  yearContext: YearContext,
  yearIndex: number,
  scenarioInflation?: number[],
  cumulativeInflation?: number[]
): { totalAmount: number; taxableAmount: number } {
  const { calendarYear } = yearContext;

  let totalAmount = 0;
  let taxableAmount = 0;

  for (const adj of plan.adjustments) {
    const adjEndYear = adj.endYear ?? adj.year;
    if (calendarYear < adj.year || calendarYear > adjEndYear) continue;

    let amount = adj.amount;

    // Apply inflation adjustment if configured — O(1) using cumulative prefix products
    if (adj.inflationAdjusted) {
      const yearsSinceStart = calendarYear - adj.year;
      if (yearsSinceStart > 0) {
        const inflationMultiplier = computeInflationMultiplierForRange(
          yearIndex - yearsSinceStart, yearIndex, plan, scenarioInflation, cumulativeInflation
        );
        amount *= inflationMultiplier;
      }
    }

    totalAmount += amount;
    if (adj.taxable) {
      taxableAmount += amount;
    }
  }

  return { totalAmount, taxableAmount };
}

/**
 * Compute compound inflation multiplier for a range of year indices,
 * matching the behavior of the original loop that used
 * getInflationRate(Math.max(0, idx), plan, scenarioInflation).
 *
 * For pre-simulation indices (< 0), the original clamped to index 0,
 * so those years all use the same rate as getInflationRate(0, ...).
 * For in-simulation indices, we use the precomputed cumulative array ratio.
 *
 * O(1) instead of O(yearsSinceStart).
 */
function computeInflationMultiplierForRange(
  startIdx: number,
  endIdx: number,
  plan: PlanInput,
  scenarioInflation?: number[],
  cumulativeInflation?: number[]
): number {
  if (endIdx <= startIdx) return 1;

  let multiplier = 1;

  // Phase 1: Pre-simulation years (startIdx < 0) — clamp to index 0's rate
  if (startIdx < 0) {
    const preSimYears = Math.min(-startIdx, endIdx - startIdx);
    const rate = getInflationRate(0, plan, scenarioInflation);
    multiplier *= Math.pow(1 + rate / 100, preSimYears);
  }

  // Phase 2: In-simulation years — use cumulative inflation ratio
  const simStart = Math.max(0, startIdx);
  const simEnd = endIdx; // endIdx is always <= yearIndex which is in the array

  if (simEnd > simStart && cumulativeInflation &&
      simEnd < cumulativeInflation.length && simStart < cumulativeInflation.length) {
    multiplier *= cumulativeInflation[simEnd] / cumulativeInflation[simStart];
  }

  return multiplier;
}

/**
 * Compute compound COLA multiplier for a range, where COLA uses a
 * per-entity constant rate (colaPct) but is replaced by scenario inflation
 * when scenario data is available for that year index.
 *
 * This mirrors the original loop pattern:
 *   if (scenarioInflation && idx >= 0 && idx < scenarioInflation.length)
 *     rate = scenarioInflation[idx]
 *   else
 *     rate = colaPct
 *
 * Uses Math.pow for constant-rate segments and prefix product ratios
 * for scenario segments. O(1) instead of O(yearsSinceStart).
 */
function computeColaMultiplierForRange(
  startIdx: number,
  endIdx: number,
  colaPct: number,
  scenarioInflation: number[],
  cumulativeInflation?: number[]
): number {
  if (endIdx <= startIdx) return 1;

  let multiplier = 1;

  // Phase 1: Pre-simulation years (startIdx < 0) — use constant colaPct
  const preSimYears = Math.max(0, Math.min(-startIdx, endIdx - startIdx));
  if (preSimYears > 0) {
    multiplier *= Math.pow(1 + colaPct / 100, preSimYears);
  }

  // Phase 2: In-simulation scenario years — use cumulative inflation ratio
  const scenarioStart = Math.max(0, startIdx);
  const scenarioEnd = Math.min(endIdx, scenarioInflation.length);

  if (scenarioEnd > scenarioStart && cumulativeInflation &&
      scenarioEnd < cumulativeInflation.length && scenarioStart < cumulativeInflation.length) {
    multiplier *= cumulativeInflation[scenarioEnd] / cumulativeInflation[scenarioStart];
  }

  // Phase 3: Post-scenario years — use constant colaPct
  if (endIdx > scenarioInflation.length) {
    const postScenarioStart = Math.max(scenarioStart, scenarioInflation.length);
    const postScenarioYears = endIdx - postScenarioStart;
    if (postScenarioYears > 0) {
      multiplier *= Math.pow(1 + colaPct / 100, postScenarioYears);
    }
  }

  return multiplier;
}

function isOwnerAlive(
  owner: 'primary' | 'spouse' | 'joint',
  primaryAlive: boolean,
  spouseAlive: boolean
): boolean {
  if (owner === 'primary') return primaryAlive;
  if (owner === 'spouse') return spouseAlive;
  // Joint: alive if either is alive
  return primaryAlive || spouseAlive;
}
