import type { PlanInput, FilingStatus } from '@finplanner/domain';
import {
  DEFAULT_FEDERAL_EFFECTIVE_RATE_PCT,
  DEFAULT_CAP_GAINS_RATE_PCT,
} from '@finplanner/domain';
import type { TaxResult, MandatoryIncome } from '../types.js';
import { computeTaxableSS } from '../helpers/ss-taxation.js';
import { lookupState } from '../helpers/state-tax-lookup.js';

/**
 * Step 9: Calculate Taxes
 *
 * Computes federal and state taxes using the effective rate model.
 *
 * Federal:
 * 1. Sum ordinary income (RMDs, NQDC, pensions, taxable adjustments, withdrawal ordinary)
 * 2. Add taxable Social Security (via provisional income method)
 * 3. Subtract standard deduction (floored at 0)
 * 4. Apply federalEffectiveRatePct
 * 5. Add capGainsRatePct * capital gains
 *
 * State:
 * 1. Same ordinary income base
 * 2. Check state's ssTaxExempt flag
 * 3. Apply state effective rates
 */
export function calculateTaxes(
  plan: PlanInput,
  mandatoryIncome: MandatoryIncome,
  rmdTotal: number,
  taxableOrdinaryFromWithdrawals: number,
  taxableCapGainsFromWithdrawals: number,
  standardDeduction: number,
  filingStatus: FilingStatus
): TaxResult {
  const { taxes, household } = plan;

  const federalEffectiveRate = taxes.federalEffectiveRatePct ?? DEFAULT_FEDERAL_EFFECTIVE_RATE_PCT;
  const capGainsRate = taxes.capGainsRatePct ?? DEFAULT_CAP_GAINS_RATE_PCT;

  // ---- Ordinary income before SS ----
  // Includes: RMDs, NQDC, taxable income streams, taxable adjustments, withdrawal ordinary income
  const ordinaryIncomeBeforeSS =
    rmdTotal +
    mandatoryIncome.nqdcDistributions +
    (mandatoryIncome.totalMandatoryTaxableOrdinary - mandatoryIncome.socialSecurityIncome - mandatoryIncome.nqdcDistributions) +
    taxableOrdinaryFromWithdrawals;

  // ---- Taxable Social Security ----
  const taxableSS = computeTaxableSS(
    mandatoryIncome.socialSecurityIncome,
    ordinaryIncomeBeforeSS,
    filingStatus
  );

  // ---- Total ordinary income ----
  const totalOrdinaryIncome = ordinaryIncomeBeforeSS + taxableSS;

  // ---- Total capital gains ----
  const totalCapitalGains =
    mandatoryIncome.totalMandatoryTaxableCapGains + taxableCapGainsFromWithdrawals;

  // ---- Federal taxes ----
  const federalTaxableOrdinary = Math.max(0, totalOrdinaryIncome - standardDeduction);
  const federalOrdinaryTax = federalTaxableOrdinary * (federalEffectiveRate / 100);
  const federalCapGainsTax = totalCapitalGains * (capGainsRate / 100);
  const taxesFederal = federalOrdinaryTax + federalCapGainsTax;

  // ---- State taxes ----
  let taxesState = 0;
  if (taxes.stateModel !== 'none') {
    taxesState = computeStateTax(
      household.stateOfResidence,
      totalOrdinaryIncome,
      taxableSS,
      totalCapitalGains,
      standardDeduction,
      taxes.stateEffectiveRatePct,
      taxes.stateCapGainsRatePct
    );
  }

  return {
    taxesFederal,
    taxesState,
    taxableOrdinaryIncome: totalOrdinaryIncome,
    taxableCapitalGains: totalCapitalGains,
  };
}

/**
 * Compute state income tax.
 */
function computeStateTax(
  stateCode: string,
  totalOrdinaryIncome: number,
  taxableSS: number,
  totalCapitalGains: number,
  standardDeduction: number,
  stateEffectiveRateOverride?: number,
  stateCapGainsRateOverride?: number
): number {
  const stateInfo = lookupState(stateCode);

  // Determine rates
  let stateIncomeRate: number;
  let stateCapGainsRate: number;

  if (stateEffectiveRateOverride !== undefined) {
    stateIncomeRate = stateEffectiveRateOverride;
  } else if (stateInfo) {
    stateIncomeRate = stateInfo.incomeRate;
  } else {
    stateIncomeRate = 0;
  }

  if (stateCapGainsRateOverride !== undefined) {
    stateCapGainsRate = stateCapGainsRateOverride;
  } else if (stateInfo) {
    stateCapGainsRate = stateInfo.capitalGainsRate;
  } else {
    stateCapGainsRate = stateIncomeRate; // fallback to income rate
  }

  // Adjust ordinary income for SS exemption
  let stateOrdinaryIncome = totalOrdinaryIncome;
  if (stateInfo) {
    if (stateInfo.ssTaxExempt === 'yes') {
      // Fully exempt: remove taxable SS from state ordinary income
      stateOrdinaryIncome -= taxableSS;
    } else if (stateInfo.ssTaxExempt === 'partial') {
      // Partial exemption: remove 50% of taxable SS
      stateOrdinaryIncome -= taxableSS * 0.5;
    }
    // 'no': SS is fully taxable at state level
  }

  // Use approximate state standard deduction (varies by state, roughly 50% of federal on average)
  // States without income tax (rate=0) won't typically reach this code path with meaningful amounts
  const stateDeduction = stateInfo?.stateStandardDeduction ?? Math.round(standardDeduction * 0.5);
  const stateTaxableOrdinary = Math.max(0, stateOrdinaryIncome - stateDeduction);

  const stateOrdinaryTax = stateTaxableOrdinary * (stateIncomeRate / 100);
  const stateCapGainsTax = totalCapitalGains * (stateCapGainsRate / 100);

  return stateOrdinaryTax + stateCapGainsTax;
}
