import { describe, it, expect } from 'vitest';
import { computeTaxYearTaxes } from '../compute-tax.js';
import { computeTotalGrossIncome, computeOrdinaryIncome, computeDeduction } from '../income-helpers.js';
import type { TaxYearRecord } from '@finplanner/domain';
import type { TaxComputationConfig } from '../types.js';

function makeRecord(overrides: Partial<TaxYearRecord> = {}): TaxYearRecord {
  return {
    taxYear: 2025,
    status: 'draft',
    filingStatus: 'mfj',
    stateOfResidence: 'WA',
    income: {
      wages: 150_000, selfEmploymentIncome: 0, interestIncome: 3_000,
      dividendIncome: 8_000, qualifiedDividends: 6_000, capitalGains: 5_000,
      capitalLosses: 0, rentalIncome: 0, nqdcDistributions: 0,
      retirementDistributions: 0, socialSecurityIncome: 0, otherIncome: 0,
    },
    deductions: { standardDeduction: 30_000, useItemized: false },
    credits: { childTaxCredit: 0, educationCredits: 0, foreignTaxCredit: 0, otherCredits: 0 },
    payments: { federalWithheld: 25_000, stateWithheld: 0, estimatedPaymentsFederal: 0, estimatedPaymentsState: 0 },
    computedFederalTax: 0, computedStateTax: 0,
    computedEffectiveFederalRate: 0, computedEffectiveStateRate: 0,
    documentIds: [],
    ...overrides,
  };
}

const config: TaxComputationConfig = {
  federalEffectiveRatePct: 22,
  capGainsRatePct: 15,
};

describe('computeTaxYearTaxes', () => {
  it('computes federal tax for a draft record', () => {
    const record = makeRecord();
    const result = computeTaxYearTaxes(record, config);
    expect(result.federalTax).toBeGreaterThan(0);
    expect(result.effectiveFederalRate).toBeGreaterThan(0);
  });

  it('returns actuals for a filed record', () => {
    const record = makeRecord({
      status: 'filed',
      computedFederalTax: 20_000,
      computedStateTax: 5_000,
      computedEffectiveFederalRate: 12,
      computedEffectiveStateRate: 3,
    });
    const result = computeTaxYearTaxes(record, config);
    expect(result.federalTax).toBe(20_000);
    expect(result.stateTax).toBe(5_000);
  });

  it('computes refund when withholding exceeds tax', () => {
    const record = makeRecord({
      payments: { federalWithheld: 50_000, stateWithheld: 0, estimatedPaymentsFederal: 0, estimatedPaymentsState: 0 },
    });
    const result = computeTaxYearTaxes(record, config);
    expect(result.refundOrBalanceDueFederal).toBeGreaterThan(0);
  });

  it('computes state tax when config has state rates', () => {
    const record = makeRecord({ stateOfResidence: 'CA' });
    const stateConfig: TaxComputationConfig = {
      ...config,
      stateEffectiveRatePct: 9.3,
    };
    const result = computeTaxYearTaxes(record, stateConfig);
    expect(result.stateTax).toBeGreaterThan(0);
  });

  it('returns zero tax for zero income', () => {
    const record = makeRecord({
      income: {
        wages: 0, selfEmploymentIncome: 0, interestIncome: 0,
        dividendIncome: 0, qualifiedDividends: 0, capitalGains: 0,
        capitalLosses: 0, rentalIncome: 0, nqdcDistributions: 0,
        retirementDistributions: 0, socialSecurityIncome: 0, otherIncome: 0,
      },
    });
    const result = computeTaxYearTaxes(record, config);
    expect(result.federalTax).toBe(0);
    expect(result.effectiveFederalRate).toBe(0);
  });
});

describe('income helpers', () => {
  const income = {
    wages: 100_000, selfEmploymentIncome: 10_000, interestIncome: 5_000,
    dividendIncome: 8_000, qualifiedDividends: 6_000, capitalGains: 12_000,
    capitalLosses: 3_000, rentalIncome: 2_000, nqdcDistributions: 0,
    retirementDistributions: 0, socialSecurityIncome: 20_000, otherIncome: 1_000,
  };

  it('computes total gross income', () => {
    // 100K + 10K + 5K + 8K + 12K + 2K + 0 + 0 + 20K + 1K - 3K = 155K
    expect(computeTotalGrossIncome(income)).toBe(155_000);
  });

  it('computes ordinary income (excludes qualified divs, CG, CL, includes taxable SS)', () => {
    const ordinary = computeOrdinaryIncome(income, 'mfj');
    // ordinary = wages(100K) + SE(10K) + interest(5K) + (divs-qualDivs)(2K) + rental(2K) + other(1K) + taxableSS
    expect(ordinary).toBeGreaterThan(120_000);
  });

  it('computeDeduction uses standard deduction', () => {
    expect(computeDeduction({ standardDeduction: 30_000, useItemized: false })).toBe(30_000);
  });

  it('computeDeduction sums itemized when useItemized', () => {
    const ded = computeDeduction({
      standardDeduction: 30_000,
      useItemized: true,
      itemizedDeductions: {
        mortgageInterest: 15_000, stateAndLocalTaxes: 10_000,
        charitableContributions: 5_000, medicalExpenses: 2_000, other: 1_000,
      },
    });
    expect(ded).toBe(33_000);
  });
});
