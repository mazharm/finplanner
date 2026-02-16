import type { TaxYearIncome, TaxYearDeductions, FilingStatus } from '@finplanner/domain';
import { computeTaxableSS } from './ss-taxation.js';

/**
 * totalGrossIncome = wages + SE + interest + divs + CG + rental + NQDC + retirement + SS + other - CL
 * Note: qualifiedDividends is a SUBSET of dividendIncome, NOT additive.
 */
export function computeTotalGrossIncome(income: TaxYearIncome): number {
  return (
    income.wages +
    income.selfEmploymentIncome +
    income.interestIncome +
    income.dividendIncome +
    income.capitalGains +
    income.rentalIncome +
    income.nqdcDistributions +
    income.retirementDistributions +
    income.socialSecurityIncome +
    income.otherIncome -
    income.capitalLosses
  );
}

/**
 * Ordinary income = everything except capital gains/losses and qualified dividends,
 * plus the taxable portion of SS.
 */
export function computeOrdinaryIncome(income: TaxYearIncome, filingStatus: FilingStatus): number {
  const taxableSS = computeTaxableSS(
    income.socialSecurityIncome,
    income.wages + income.selfEmploymentIncome + income.interestIncome +
    (income.dividendIncome - income.qualifiedDividends) +
    income.rentalIncome + income.nqdcDistributions +
    income.retirementDistributions + income.otherIncome,
    filingStatus
  );

  return (
    income.wages +
    income.selfEmploymentIncome +
    income.interestIncome +
    (income.dividendIncome - income.qualifiedDividends) +
    income.rentalIncome +
    income.nqdcDistributions +
    income.retirementDistributions +
    income.otherIncome +
    taxableSS
  );
}

/**
 * Deduction amount: if useItemized, sum of itemized deductions; otherwise standardDeduction.
 */
export function computeDeduction(deductions: TaxYearDeductions): number {
  if (deductions.useItemized && deductions.itemizedDeductions) {
    const d = deductions.itemizedDeductions;
    return d.mortgageInterest + d.stateAndLocalTaxes + d.charitableContributions + d.medicalExpenses + d.other;
  }
  return deductions.standardDeduction;
}
