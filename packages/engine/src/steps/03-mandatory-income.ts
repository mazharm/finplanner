import type { PlanInput, PersonProfile } from '@finplanner/domain';
import type { SimulationState, AccountState, YearContext, MandatoryIncome } from '../types.js';
import { getInflationRate, getCumulativeInflation } from '../helpers/inflation.js';

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

  // --- Social Security ---
  socialSecurityIncome = computeSocialSecurity(plan, yearContext, yearIndex, scenarioInflation);

  // --- NQDC distributions ---
  nqdcDistributions = computeNqdcDistributions(state, yearContext);

  // --- Pensions and other income streams ---
  const incomeResult = computeIncomeStreams(plan, yearContext, yearIndex, scenarioInflation);
  pensionAndOtherIncome = incomeResult.totalIncome;
  totalMandatoryTaxableOrdinary += incomeResult.taxableOrdinary;

  // --- Adjustments ---
  const adjResult = computeAdjustments(plan, yearContext, yearIndex, scenarioInflation);
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
  scenarioInflation?: number[]
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
      scenarioInflation
    );
  }

  // Compute spouse SS
  if (spouseAlive && household.spouse?.socialSecurity) {
    spouseSS = computePersonSS(
      household.spouse,
      calendarYear,
      yearIndex,
      plan,
      scenarioInflation
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
        scenarioInflation
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
 */
function computePersonSS(
  person: PersonProfile,
  calendarYear: number,
  yearIndex: number,
  plan: PlanInput,
  scenarioInflation?: number[]
): number {
  const ss = person.socialSecurity;
  if (!ss) return 0;

  const claimYear = person.birthYear + ss.claimAge;
  if (calendarYear < claimYear) return 0;

  const baseBenefit = ss.estimatedMonthlyBenefitAtClaim * 12;

  // Years since claiming started
  const yearsSinceClaim = calendarYear - claimYear;
  if (yearsSinceClaim === 0) return baseBenefit;

  // Grow by COLA for each year since claiming
  let benefit = baseBenefit;
  for (let i = 0; i < yearsSinceClaim; i++) {
    // The claim year corresponds to a specific yearIndex
    const claimYearIndex = yearIndex - yearsSinceClaim;
    const colaYearIndex = claimYearIndex + i;

    let colaRate: number;
    if (scenarioInflation && colaYearIndex >= 0 && colaYearIndex < scenarioInflation.length) {
      // Scenario inflation replaces SS COLA
      colaRate = scenarioInflation[colaYearIndex];
    } else {
      colaRate = ss.colaPct;
    }

    benefit *= (1 + colaRate / 100);
  }

  return benefit;
}

/**
 * Compute NQDC (deferred compensation) distributions.
 * For deferredComp accounts with schedules, check if the current year
 * falls within the distribution window.
 */
function computeNqdcDistributions(
  state: SimulationState,
  yearContext: YearContext
): number {
  const { accounts, plan, yearIndex, scenarioInflation } = state;
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

      // Inflate if configured
      if (inflationAdjusted) {
        const yearsSinceStart = calendarYear - startYear;
        let inflationMultiplier = 1;
        for (let i = 0; i < yearsSinceStart; i++) {
          const idx = yearIndex - yearsSinceStart + i;
          const rate = getInflationRate(Math.max(0, idx), plan, scenarioInflation);
          inflationMultiplier *= (1 + rate / 100);
        }
        distributionAmount *= inflationMultiplier;
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
 */
function computeIncomeStreams(
  plan: PlanInput,
  yearContext: YearContext,
  yearIndex: number,
  scenarioInflation?: number[]
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
      // Grow by COLA. In scenario modes, scenario inflation replaces non-zero colaPct.
      for (let i = 0; i < yearsSinceStart; i++) {
        const colaYearIndex = yearIndex - yearsSinceStart + i;
        let colaRate: number;
        if (scenarioInflation && colaYearIndex >= 0 && colaYearIndex < scenarioInflation.length) {
          colaRate = scenarioInflation[colaYearIndex];
        } else {
          colaRate = stream.colaPct ?? 0;
        }
        amount *= (1 + colaRate / 100);
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
 */
function computeAdjustments(
  plan: PlanInput,
  yearContext: YearContext,
  yearIndex: number,
  scenarioInflation?: number[]
): { totalAmount: number; taxableAmount: number } {
  const { calendarYear } = yearContext;

  let totalAmount = 0;
  let taxableAmount = 0;

  for (const adj of plan.adjustments) {
    const adjEndYear = adj.endYear ?? adj.year;
    if (calendarYear < adj.year || calendarYear > adjEndYear) continue;

    let amount = adj.amount;

    // Apply inflation adjustment if configured
    if (adj.inflationAdjusted) {
      const yearsSinceStart = calendarYear - adj.year;
      if (yearsSinceStart > 0) {
        let inflationMultiplier = 1;
        for (let i = 0; i < yearsSinceStart; i++) {
          const idx = yearIndex - yearsSinceStart + i;
          const rate = getInflationRate(Math.max(0, idx), plan, scenarioInflation);
          inflationMultiplier *= (1 + rate / 100);
        }
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
