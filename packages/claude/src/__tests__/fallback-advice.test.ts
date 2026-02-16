import { describe, it, expect } from 'vitest';
import { getPortfolioFallbackAdvice, getTaxFallbackAdvice } from '../fallback-advice.js';
import type { PortfolioAdviceRequest, TaxStrategyAdviceRequest } from '@finplanner/domain';

function makePortfolioRequest(overrides?: Record<string, unknown>): PortfolioAdviceRequest {
  return {
    planInput: {
      schemaVersion: '3.0.0',
      household: {
        maritalStatus: 'married',
        filingStatus: 'mfj',
        stateOfResidence: 'WA',
        primary: { id: 'primary', birthYear: 1970, currentAge: 56, retirementAge: 65, lifeExpectancy: 90 },
        spouse: { id: 'spouse', birthYear: 1972, currentAge: 54, retirementAge: 65, lifeExpectancy: 92 },
      },
      accounts: [
        { id: 'a1', name: 'Brokerage', type: 'taxable', owner: 'primary', currentBalance: 500_000, expectedReturnPct: 7, feePct: 0.1 },
        { id: 'a2', name: '401k', type: 'taxDeferred', owner: 'primary', currentBalance: 800_000, expectedReturnPct: 7, feePct: 0.05 },
        { id: 'a3', name: 'Roth', type: 'roth', owner: 'spouse', currentBalance: 200_000, expectedReturnPct: 7, feePct: 0.03 },
      ],
      otherIncome: [],
      adjustments: [],
      spending: { targetAnnualSpend: 80_000, inflationPct: 2.5, survivorSpendingAdjustmentPct: 75 },
      taxes: { federalModel: 'effective', stateModel: 'none', federalEffectiveRatePct: 22, capGainsRatePct: 15 },
      market: { simulationMode: 'deterministic' },
      strategy: { withdrawalOrder: 'taxOptimized', rebalanceFrequency: 'annual', guardrailsEnabled: false },
    },
    planResultSummary: { successProbability: 0.85, medianTerminalValue: 500_000, worstCaseShortfall: 50_000 },
    userPreferences: { riskTolerance: 'moderate', spendingFloor: 60_000, legacyGoal: 100_000 },
    ...overrides,
  } as PortfolioAdviceRequest;
}

function makeTaxRequest(overrides?: Record<string, unknown>): TaxStrategyAdviceRequest {
  return {
    taxYear: 2025,
    taxYearRecord: {
      taxYear: 2025,
      status: 'draft',
      filingStatus: 'mfj',
      stateOfResidence: 'WA',
      income: { wages: 150_000, selfEmploymentIncome: 0, interestIncome: 5_000, dividendIncome: 8_000, qualifiedDividends: 6_000, capitalGains: 10_000, capitalLosses: 2_000, rentalIncome: 24_000, nqdcDistributions: 0, retirementDistributions: 0, socialSecurityIncome: 0, otherIncome: 0 },
      deductions: { standardDeduction: 30_000, useItemized: false },
      credits: { childTaxCredit: 0, educationCredits: 0, foreignTaxCredit: 0, otherCredits: 0 },
      payments: { federalWithheld: 25_000, stateWithheld: 0, estimatedPaymentsFederal: 5_000, estimatedPaymentsState: 0 },
      computedFederalTax: 35_000,
      computedStateTax: 0,
      computedEffectiveFederalRate: 17.9,
      computedEffectiveStateRate: 0,
      documentIds: [],
    },
    priorYearRecord: null,
    sharedCorpus: {
      household: {
        maritalStatus: 'married',
        filingStatus: 'mfj',
        stateOfResidence: 'WA',
        primary: { id: 'primary', birthYear: 1970, currentAge: 55, retirementAge: 65, lifeExpectancy: 90 },
        spouse: { id: 'spouse', birthYear: 1972, currentAge: 53, retirementAge: 65, lifeExpectancy: 92 },
      },
      accounts: [
        { id: 'a1', name: 'Brokerage', type: 'taxable', owner: 'primary', currentBalance: 500_000, expectedReturnPct: 7, feePct: 0.1 },
      ],
      incomeStreams: [],
    },
    userPreferences: { prioritize: 'minimize_tax' },
    ...overrides,
  } as TaxStrategyAdviceRequest;
}

describe('getPortfolioFallbackAdvice', () => {
  it('shortfall triggers recommendation', () => {
    const result = getPortfolioFallbackAdvice(makePortfolioRequest());
    const titles = result.recommendations.map((r) => r.title);
    expect(titles).toContain('Address Potential Shortfall');
  });

  it('4% rule violation triggers recommendation', () => {
    // Total balance = 1.5M, 4% = 60k, spendingFloor = 70k → violation
    const req = makePortfolioRequest();
    req.userPreferences.spendingFloor = 70_000;
    const result = getPortfolioFallbackAdvice(req);
    const titles = result.recommendations.map((r) => r.title);
    expect(titles).toContain('Spending Floor Exceeds 4% Rule');
  });

  it('tax-optimized withdrawal when mixed account types', () => {
    const result = getPortfolioFallbackAdvice(makePortfolioRequest());
    const titles = result.recommendations.map((r) => r.title);
    expect(titles).toContain('Tax-Optimized Withdrawal Ordering');
  });

  it('stress scenario always present', () => {
    const result = getPortfolioFallbackAdvice(makePortfolioRequest());
    const titles = result.recommendations.map((r) => r.title);
    expect(titles).toContain('Review Stress Scenarios');
  });

  it('all recommendations have source: "fallback"', () => {
    const result = getPortfolioFallbackAdvice(makePortfolioRequest());
    for (const rec of result.recommendations) {
      expect(rec.source).toBe('fallback');
    }
  });

  it('includes disclaimer', () => {
    const result = getPortfolioFallbackAdvice(makePortfolioRequest());
    expect(result.disclaimer).toContain('rule-based');
  });
});

describe('getTaxFallbackAdvice', () => {
  it('estimated payment adequacy warning triggers when underpaid', () => {
    const result = getTaxFallbackAdvice(makeTaxRequest());
    const titles = result.recommendations.map((r) => r.title);
    // federalWithheld(25k) + estimatedFederal(5k) = 30k < 35k * 0.9 = 31.5k → trigger
    expect(titles).toContain('Federal Payment Shortfall');
  });

  it('filing status optimization for married', () => {
    const result = getTaxFallbackAdvice(makeTaxRequest());
    const opTitles = result.taxOptimizationOpportunities.map((o) => o.title);
    expect(opTitles).toContain('Filing Status Comparison');
  });

  it('all recommendations have source: "fallback"', () => {
    const result = getTaxFallbackAdvice(makeTaxRequest());
    for (const rec of result.recommendations) {
      expect(rec.source).toBe('fallback');
    }
  });

  it('includes disclaimer', () => {
    const result = getTaxFallbackAdvice(makeTaxRequest());
    expect(result.disclaimer).toContain('rule-based');
  });
});
