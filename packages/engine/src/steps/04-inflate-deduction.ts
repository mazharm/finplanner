import type { FilingStatus } from '@finplanner/domain';
import {
  STANDARD_DEDUCTIONS,
  EXTRA_DEDUCTION_SINGLE_65_PLUS,
  EXTRA_DEDUCTION_MFJ_65_PLUS_PER_PERSON,
} from '@finplanner/domain';
import type { SimulationState, YearContext } from '../types.js';
import { getCumulativeInflation } from '../helpers/inflation.js';

/**
 * Step 4: Inflate Standard Deduction
 *
 * Computes the standard deduction for the current year, including:
 * - Base deduction for the filing status (or override)
 * - Inflation adjustment from year 1
 * - Age-based bonus for individuals 65+
 *
 * Without override: base resets to the new filing status's default on transitions.
 *   standardDeduction(year N) = defaultDeduction(filingStatus_N) * (1 + inflationPct/100)^(N-1)
 *   where N is 1-indexed (yearIndex is 0-indexed, so exponent = yearIndex)
 *
 * With override: the override amount is used as the base regardless of filing status transitions.
 *   standardDeduction(year N) = override * (1 + inflationPct/100)^(N-1)
 */
export function inflateDeduction(
  state: SimulationState,
  yearContext: YearContext
): number {
  const { plan, yearIndex, scenarioInflation } = state;
  const { filingStatus, agePrimary, ageSpouse, primaryAlive, spouseAlive } = yearContext;

  // Compute cumulative inflation multiplier
  // yearIndex 0 = year 1, exponent = 0, so multiplier = 1.0
  const inflationMultiplier = getCumulativeInflation(yearIndex, plan, scenarioInflation);

  let baseDeduction: number;

  if (plan.taxes.standardDeductionOverride !== undefined) {
    // With override: use override as base, inflated from year 1
    baseDeduction = plan.taxes.standardDeductionOverride;
  } else {
    // Without override: use the current filing status's default deduction
    baseDeduction = STANDARD_DEDUCTIONS[filingStatus];
  }

  let deduction = baseDeduction * inflationMultiplier;

  // Age-based bonus deductions
  deduction += computeAgeBonusDeduction(
    filingStatus,
    agePrimary,
    ageSpouse,
    primaryAlive,
    spouseAlive,
    inflationMultiplier
  );

  return deduction;
}

/**
 * Compute the age-based bonus standard deduction.
 *
 * For MFJ / survivor (first 2 years): $1,300 per qualifying person age 65+
 * For single / survivor (year 3+): $1,550 if age 65+
 *
 * The bonus amounts are also inflated.
 */
function computeAgeBonusDeduction(
  filingStatus: FilingStatus,
  agePrimary: number,
  ageSpouse: number | undefined,
  primaryAlive: boolean,
  spouseAlive: boolean,
  inflationMultiplier: number
): number {
  let bonus = 0;

  if (filingStatus === 'single') {
    // Single filer: $1,550 bonus if 65+
    if (primaryAlive && agePrimary >= 65) {
      bonus += EXTRA_DEDUCTION_SINGLE_65_PLUS;
    }
    // In survivor-turned-single, the survivor could be primary or spouse
    if (!primaryAlive && spouseAlive && ageSpouse !== undefined && ageSpouse >= 65) {
      bonus += EXTRA_DEDUCTION_SINGLE_65_PLUS;
    }
  } else {
    // MFJ or survivor (first 2 years): $1,300 per qualifying person
    if (primaryAlive && agePrimary >= 65) {
      bonus += EXTRA_DEDUCTION_MFJ_65_PLUS_PER_PERSON;
    }
    if (spouseAlive && ageSpouse !== undefined && ageSpouse >= 65) {
      bonus += EXTRA_DEDUCTION_MFJ_65_PLUS_PER_PERSON;
    }
  }

  // Inflate the bonus amounts
  return bonus * inflationMultiplier;
}
