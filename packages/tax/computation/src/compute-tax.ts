import type { TaxYearRecord } from '@finplanner/domain';
import {
  CAPITAL_LOSS_DEDUCTION_CAP,
  NIIT_RATE,
  NIIT_THRESHOLD_MFJ,
  NIIT_THRESHOLD_SINGLE,
  SE_TAX_SS_RATE,
  SE_TAX_MEDICARE_RATE,
  SE_INCOME_ADJUSTMENT,
  SS_WAGE_BASE,
  ADDITIONAL_MEDICARE_RATE,
  ADDITIONAL_MEDICARE_THRESHOLD_MFJ,
  ADDITIONAL_MEDICARE_THRESHOLD_SINGLE,
} from '@finplanner/domain';
import type { TaxComputationConfig, TaxComputationResult } from './types.js';
import { computeTotalGrossIncome, computeOrdinaryIncome, computeDeduction } from './income-helpers.js';
import { computeTaxableSS } from './ss-taxation.js';

export function computeTaxYearTaxes(
  record: TaxYearRecord,
  config: TaxComputationConfig
): TaxComputationResult {
  if (record.status === 'filed' || record.status === 'amended') {
    return {
      federalTax: record.computedFederalTax,
      stateTax: record.computedStateTax,
      totalTax: record.computedFederalTax + record.computedStateTax,
      effectiveFederalRate: record.computedEffectiveFederalRate,
      effectiveStateRate: record.computedEffectiveStateRate,
      refundOrBalanceDueFederal: record.refundOrBalanceDueFederal ?? 0,
      refundOrBalanceDueState: record.refundOrBalanceDueState ?? 0,
    };
  }

  const totalGross = computeTotalGrossIncome(record.income);
  const ordinary = computeOrdinaryIncome(record.income, record.filingStatus);
  const deduction = computeDeduction(record.deductions, totalGross);

  let taxableOrdinary = Math.max(0, ordinary - deduction);

  // IRS caps net capital loss deduction at $3,000/year
  const CAPITAL_LOSS_CAP = CAPITAL_LOSS_DEDUCTION_CAP;
  const rawNetCapGains = record.income.capitalGains - record.income.capitalLosses;
  const netCapGains = rawNetCapGains >= 0
    ? rawNetCapGains
    : Math.max(-CAPITAL_LOSS_CAP, rawNetCapGains); // loss capped at -$3,000

  // If net capital loss, deduct from ordinary income (IRS allows up to $3,000)
  if (netCapGains < 0) {
    taxableOrdinary = Math.max(0, taxableOrdinary + netCapGains); // netCapGains is negative, so this subtracts
  }

  // Self-employment tax: 15.3% up to SS wage base, then 2.9% above
  // W-2 wages count first against the SS wage base
  let seTax = 0;
  if (record.income.selfEmploymentIncome > 0) {
    const seIncome = record.income.selfEmploymentIncome * SE_INCOME_ADJUSTMENT;
    const remainingSSBase = Math.max(0, SS_WAGE_BASE - record.income.wages);
    const seSubjectToSS = Math.min(seIncome, remainingSSBase);
    seTax = seSubjectToSS * SE_TAX_SS_RATE + seIncome * SE_TAX_MEDICARE_RATE;
  }

  // IRS allows deduction of 50% of SE tax from AGI (Schedule 1, Part II, line 15)
  // Must be applied before computing baseFederalTax so it reduces taxable ordinary income
  if (seTax > 0) {
    taxableOrdinary = Math.max(0, taxableOrdinary - seTax * 0.5);
  }

  const preferentialIncome = Math.max(0, netCapGains) + record.income.qualifiedDividends;

  const totalCredits = record.credits.childTaxCredit + record.credits.educationCredits +
    record.credits.foreignTaxCredit + record.credits.otherCredits;

  const baseFederalTax = Math.max(
    0,
    (taxableOrdinary * config.federalEffectiveRatePct / 100) +
    (preferentialIncome * config.capGainsRatePct / 100) -
    totalCredits
  );

  // NIIT: 3.8% on lesser of net investment income or MAGI above threshold
  // For NIIT, MAGI should use capital losses capped at $3,000 (not unlimited)
  const niitThreshold = record.filingStatus === 'mfj' || record.filingStatus === 'survivor' ? NIIT_THRESHOLD_MFJ : NIIT_THRESHOLD_SINGLE;
  const netInvestmentIncome = record.income.interestIncome + record.income.dividendIncome +
    Math.max(0, rawNetCapGains) + record.income.rentalIncome;
  // totalGross includes uncapped net cap gains (capitalGains - capitalLosses = rawNetCapGains).
  // Replace with capped net cap gains for NIIT MAGI.
  const niitMagi = totalGross - rawNetCapGains + netCapGains;
  const magiOverThreshold = Math.max(0, niitMagi - niitThreshold);
  const niit = NIIT_RATE * Math.min(netInvestmentIncome, magiOverThreshold);

  // Additional Medicare Tax: 0.9% on wages + SE income (92.35% adjusted) above threshold
  const additionalMedicareThreshold = record.filingStatus === 'mfj' || record.filingStatus === 'survivor' ? ADDITIONAL_MEDICARE_THRESHOLD_MFJ : ADDITIONAL_MEDICARE_THRESHOLD_SINGLE;
  const wagesAndSE = record.income.wages + record.income.selfEmploymentIncome * SE_INCOME_ADJUSTMENT;
  const additionalMedicare = Math.max(0, wagesAndSE - additionalMedicareThreshold) * ADDITIONAL_MEDICARE_RATE;

  const federalTax = baseFederalTax + niit + seTax + additionalMedicare;

  // State tax
  let stateTax = 0;
  const stateRatePct = config.stateEffectiveRatePct ?? 0;
  const stateCapGainsRatePct = config.stateCapGainsRatePct ?? stateRatePct;

  if (stateRatePct > 0 || stateCapGainsRatePct > 0) {
    // Use state-specific standard deduction; fall back to ~50% of federal (most states have
    // smaller standard deductions than federal), consistent with engine's 09-calculate-taxes.ts
    const stateDeduction = config.stateStandardDeduction ?? Math.round(deduction * 0.5);
    let stateOrdinary = Math.max(0, ordinary - stateDeduction);
    // If state exempts SS, remove the taxable SS portion from state ordinary
    if (config.ssTaxExempt) {
      const taxableSS = computeTaxableSS(
        record.income.socialSecurityIncome,
        // Pass same otherTaxableIncome as used in computeOrdinaryIncome
        record.income.wages + record.income.selfEmploymentIncome + record.income.interestIncome +
        (record.income.dividendIncome - record.income.qualifiedDividends) +
        record.income.rentalIncome + record.income.nqdcDistributions +
        record.income.retirementDistributions + record.income.otherIncome +
        Math.max(0, record.income.capitalGains - record.income.capitalLosses),
        record.filingStatus
      );
      const ordinaryWithoutSS = ordinary - taxableSS;
      stateOrdinary = Math.max(0, ordinaryWithoutSS - stateDeduction);
    }
    // Compute state preferential income: apply threshold and qualified dividend exclusions
    let statePreferentialIncome = preferentialIncome;
    if (config.stateCapGainsExcludesQualDivs) {
      statePreferentialIncome = Math.max(0, netCapGains);
    }
    if (config.stateCapGainsThreshold) {
      statePreferentialIncome = Math.max(0, statePreferentialIncome - config.stateCapGainsThreshold);
    }
    stateTax = Math.max(0,
      (stateOrdinary * stateRatePct / 100) + (statePreferentialIncome * stateCapGainsRatePct / 100)
    );
  }

  const totalFederalPaid = record.payments.federalWithheld + record.payments.estimatedPaymentsFederal;
  const totalStatePaid = record.payments.stateWithheld + record.payments.estimatedPaymentsState;

  // Use gross income as denominator for conventional effective rate definition
  const effectiveFederalRate = totalGross > 0 ? (federalTax / totalGross) * 100 : 0;
  const effectiveStateRate = totalGross > 0 ? (stateTax / totalGross) * 100 : 0;

  return {
    federalTax,
    stateTax,
    totalTax: federalTax + stateTax,
    effectiveFederalRate,
    effectiveStateRate,
    refundOrBalanceDueFederal: totalFederalPaid - federalTax,
    refundOrBalanceDueState: totalStatePaid - stateTax,
  };
}
