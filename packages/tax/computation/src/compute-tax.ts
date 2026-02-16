import type { TaxYearRecord } from '@finplanner/domain';
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

  // IRS caps net capital loss deduction at $3,000/year ($1,500 MFS)
  const CAPITAL_LOSS_CAP = 3000;
  const rawNetCapGains = record.income.capitalGains - record.income.capitalLosses;
  const netCapGains = rawNetCapGains >= 0
    ? rawNetCapGains
    : Math.max(-CAPITAL_LOSS_CAP, rawNetCapGains); // loss capped at -$3,000

  // If net capital loss, deduct from ordinary income (IRS allows up to $3,000)
  if (netCapGains < 0) {
    taxableOrdinary = Math.max(0, taxableOrdinary + netCapGains); // netCapGains is negative, so this subtracts
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
  const NIIT_RATE = 0.038;
  const NIIT_THRESHOLD = record.filingStatus === 'mfj' || record.filingStatus === 'survivor' ? 250_000 : 200_000;
  const netInvestmentIncome = record.income.interestIncome + record.income.dividendIncome +
    Math.max(0, rawNetCapGains) + record.income.rentalIncome;
  const magiOverThreshold = Math.max(0, totalGross - NIIT_THRESHOLD);
  const niit = NIIT_RATE * Math.min(netInvestmentIncome, magiOverThreshold);

  // Self-employment tax: 15.3% up to SS wage base ($168,600 for 2025), then 2.9% above
  let seTax = 0;
  if (record.income.selfEmploymentIncome > 0) {
    const SE_TAX_RATE_FULL = 0.153; // 12.4% SS + 2.9% Medicare
    const SE_MEDICARE_RATE = 0.029;
    const SS_WAGE_BASE = 168_600;
    const seIncome = record.income.selfEmploymentIncome * 0.9235; // 92.35% of SE income
    if (seIncome <= SS_WAGE_BASE) {
      seTax = seIncome * SE_TAX_RATE_FULL;
    } else {
      seTax = SS_WAGE_BASE * SE_TAX_RATE_FULL + (seIncome - SS_WAGE_BASE) * SE_MEDICARE_RATE;
    }
  }

  // Additional Medicare Tax: 0.9% on wages + SE income above threshold
  const ADDITIONAL_MEDICARE_RATE = 0.009;
  const ADDITIONAL_MEDICARE_THRESHOLD = record.filingStatus === 'mfj' || record.filingStatus === 'survivor' ? 250_000 : 200_000;
  const wagesAndSE = record.income.wages + record.income.selfEmploymentIncome;
  const additionalMedicare = Math.max(0, wagesAndSE - ADDITIONAL_MEDICARE_THRESHOLD) * ADDITIONAL_MEDICARE_RATE;

  const federalTax = baseFederalTax + niit + seTax + additionalMedicare;

  // State tax
  let stateTax = 0;
  const stateRatePct = config.stateEffectiveRatePct ?? 0;
  const stateCapGainsRatePct = config.stateCapGainsRatePct ?? stateRatePct;

  if (stateRatePct > 0 || stateCapGainsRatePct > 0) {
    let stateOrdinary = taxableOrdinary;
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
      stateOrdinary = Math.max(0, ordinaryWithoutSS - deduction);
    }
    stateTax = Math.max(0,
      (stateOrdinary * stateRatePct / 100) + (preferentialIncome * stateCapGainsRatePct / 100)
    );
  }

  const totalFederalPaid = record.payments.federalWithheld + record.payments.estimatedPaymentsFederal;
  const totalStatePaid = record.payments.stateWithheld + record.payments.estimatedPaymentsState;

  // Use taxable income (ordinary + preferential) as denominator for more accurate effective rate
  const taxableBase = taxableOrdinary + preferentialIncome;
  const effectiveFederalRate = taxableBase > 0 ? (federalTax / taxableBase) * 100 : 0;
  const effectiveStateRate = taxableBase > 0 ? (stateTax / taxableBase) * 100 : 0;

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
