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
      excessCapitalLosses: Math.max(0, record.income.capitalLosses - record.income.capitalGains),
    };
  }

  const totalGross = computeTotalGrossIncome(record.income);
  const ordinary = computeOrdinaryIncome(record.income, record.filingStatus);
  const deduction = computeDeduction(record.deductions, totalGross);

  const taxableOrdinary = Math.max(0, ordinary - deduction);

  // Per spec §8.4 step 5 and §19.1 item 5: excess capital losses do NOT offset
  // ordinary income, do NOT offset qualified dividends, and are NOT carried forward.
  const netCapGains = Math.max(0, record.income.capitalGains - record.income.capitalLosses);
  const excessCapitalLosses = Math.max(0, record.income.capitalLosses - record.income.capitalGains);

  const preferentialIncome = netCapGains + record.income.qualifiedDividends;

  const totalCredits = record.credits.childTaxCredit + record.credits.educationCredits +
    record.credits.foreignTaxCredit + record.credits.otherCredits;

  // Per spec §19.1 item 3: AMT / NIIT / phase-outs are not modeled.
  // Federal tax uses effective rates only (no SE tax, NIIT, or additional Medicare).
  const federalTax = Math.max(
    0,
    (taxableOrdinary * config.federalEffectiveRatePct / 100) +
    (preferentialIncome * config.capGainsRatePct / 100) -
    totalCredits
  );

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
    excessCapitalLosses,
  };
}
