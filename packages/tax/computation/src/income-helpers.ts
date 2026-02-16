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
    income.retirementDistributions + income.otherIncome +
    Math.max(0, income.capitalGains - income.capitalLosses),
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
 * Deduction amount: if useItemized, sum of itemized deductions with SALT cap and medical AGI floor;
 * otherwise standardDeduction.
 */
export function computeDeduction(deductions: TaxYearDeductions, grossIncome?: number): number {
  if (deductions.useItemized && deductions.itemizedDeductions) {
    const d = deductions.itemizedDeductions;
    // SALT cap: $10,000 max (TCJA)
    const saltCapped = Math.min(d.stateAndLocalTaxes, 10_000);
    // Medical expense floor: only amount exceeding 7.5% of AGI is deductible
    const medicalFloor = grossIncome ? grossIncome * 0.075 : 0;
    const medicalDeductible = Math.max(0, d.medicalExpenses - medicalFloor);
    return d.mortgageInterest + saltCapped + d.charitableContributions + medicalDeductible + d.other;
  }
  return deductions.standardDeduction;
}
