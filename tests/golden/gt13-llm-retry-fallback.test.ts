import { describe, it, expect, vi } from 'vitest';
import { getPortfolioAdvice } from '@finplanner/claude';
import { getTaxStrategyAdvice } from '@finplanner/claude';
import type { LlmClient } from '@finplanner/claude';
import type { PortfolioAdviceRequest, PortfolioAdviceResponse, TaxStrategyAdviceRequest, TaxStrategyAdviceResponse } from '@finplanner/domain';

// ── Fixtures ──

const portfolioRequest: PortfolioAdviceRequest = {
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
      { id: 'a1', name: 'Fidelity Brokerage', type: 'taxable', owner: 'primary', currentBalance: 500_000, expectedReturnPct: 7, feePct: 0.1 },
      { id: 'a2', name: 'Vanguard 401k', type: 'taxDeferred', owner: 'primary', currentBalance: 800_000, expectedReturnPct: 7, feePct: 0.05 },
      { id: 'a3', name: 'Schwab Roth', type: 'roth', owner: 'spouse', currentBalance: 200_000, expectedReturnPct: 7, feePct: 0.03 },
    ],
    otherIncome: [
      { id: 'i1', name: 'Company Pension', owner: 'primary', startYear: 2035, annualAmount: 30_000, taxable: true },
      { id: 'i2', name: 'Rental Income', owner: 'joint', startYear: 2026, endYear: 2040, annualAmount: 24_000, taxable: true },
    ],
    adjustments: [],
    spending: { targetAnnualSpend: 80_000, inflationPct: 2.5, survivorSpendingAdjustmentPct: 75 },
    taxes: { federalModel: 'effective', stateModel: 'none', federalEffectiveRatePct: 22, capGainsRatePct: 15 },
    market: { simulationMode: 'deterministic' },
    strategy: { withdrawalOrder: 'taxOptimized', rebalanceFrequency: 'annual', guardrailsEnabled: false },
  },
  planResultSummary: { successProbability: 0.85, medianTerminalValue: 500_000, worstCaseShortfall: 50_000 },
  userPreferences: { riskTolerance: 'moderate', spendingFloor: 60_000, legacyGoal: 100_000 },
};

const validPortfolioResponse: PortfolioAdviceResponse = {
  recommendations: [
    { title: 'Diversify', rationale: 'Reduce concentration risk', expectedImpact: 'Lower volatility', tradeoffs: ['Potentially lower returns'], source: 'llm' },
    { title: 'Rebalance', rationale: 'Maintain target allocation', expectedImpact: 'Risk-adjusted returns', tradeoffs: ['Transaction costs'], source: 'llm' },
    { title: 'Tax-Loss Harvest', rationale: 'Offset gains', expectedImpact: 'Tax savings', tradeoffs: ['Wash sale rules'], source: 'llm' },
  ],
  withdrawalStrategyAdvice: [{ title: 'Taxable First', rationale: 'Preserve tax-advantaged growth' }],
  riskFlags: ['Sequence of returns risk near retirement'],
  assumptionSensitivity: ['Return assumptions sensitive to market conditions'],
  disclaimer: 'AI-generated guidance. Consult a qualified financial advisor.',
};

const taxRequest: TaxStrategyAdviceRequest = {
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
      { id: 'a1', name: 'Fidelity Brokerage', type: 'taxable', owner: 'primary', currentBalance: 500_000, expectedReturnPct: 7, feePct: 0.1 },
    ],
    incomeStreams: [
      { id: 'i1', name: 'Company Pension', owner: 'primary', startYear: 2035, annualAmount: 30_000, taxable: true },
    ],
  },
  userPreferences: { prioritize: 'minimize_tax' },
};

const validTaxResponse: TaxStrategyAdviceResponse = {
  recommendations: [
    { title: 'Maximize Deductions', rationale: 'Reduce taxable income', expectedImpact: 'Lower tax liability', tradeoffs: ['Requires documentation'], source: 'llm' },
  ],
  taxOptimizationOpportunities: [{ title: 'Roth Conversion', rationale: 'Lock in current rate' }],
  riskFlags: [],
  disclaimer: 'AI-generated guidance. Consult a qualified tax professional.',
};

// ── GT13: Portfolio Advisor ──

describe('GT13: LLM Advice Retry & Fallback — Portfolio', () => {
  it('valid LLM response → advice with source "llm"', async () => {
    const client: LlmClient = {
      sendMessage: vi.fn().mockResolvedValue(JSON.stringify(validPortfolioResponse)),
    };
    const result = await getPortfolioAdvice(portfolioRequest, client);
    expect(result.recommendations[0].source).toBe('llm');
    expect(result.recommendations[0].title).toBe('Diversify');
    expect(result.disclaimer).toContain('financial advisor');
  });

  it('invalid JSON first, valid JSON second → retry succeeded', async () => {
    const client: LlmClient = {
      sendMessage: vi
        .fn()
        .mockResolvedValueOnce('{ broken json }}}')
        .mockResolvedValueOnce(JSON.stringify(validPortfolioResponse)),
    };
    const result = await getPortfolioAdvice(portfolioRequest, client);
    expect(result.recommendations[0].source).toBe('llm');
    expect(client.sendMessage).toHaveBeenCalledTimes(2);
  });

  it('invalid JSON twice → fallback with source "fallback"', async () => {
    const client: LlmClient = {
      sendMessage: vi.fn().mockResolvedValue('not valid json'),
    };
    const result = await getPortfolioAdvice(portfolioRequest, client);
    expect(result.recommendations.every((r) => r.source === 'fallback')).toBe(true);
    expect(result.disclaimer).toContain('rule-based');
  });

  it('LLM throws error → fallback', async () => {
    const client: LlmClient = {
      sendMessage: vi.fn().mockRejectedValue(new Error('Network timeout')),
    };
    const result = await getPortfolioAdvice(portfolioRequest, client);
    expect(result.recommendations.every((r) => r.source === 'fallback')).toBe(true);
  });

  it('no LlmClient → fallback', async () => {
    const result = await getPortfolioAdvice(portfolioRequest);
    expect(result.recommendations.every((r) => r.source === 'fallback')).toBe(true);
  });
});

// ── GT13: Tax Advisor ──

describe('GT13: LLM Advice Retry & Fallback — Tax', () => {
  it('valid LLM response → advice with source "llm"', async () => {
    const client: LlmClient = {
      sendMessage: vi.fn().mockResolvedValue(JSON.stringify(validTaxResponse)),
    };
    const result = await getTaxStrategyAdvice(taxRequest, client);
    expect(result.recommendations[0].source).toBe('llm');
    expect(result.recommendations[0].title).toBe('Maximize Deductions');
  });

  it('invalid JSON first, valid JSON second → retry succeeded', async () => {
    const client: LlmClient = {
      sendMessage: vi
        .fn()
        .mockResolvedValueOnce('bad')
        .mockResolvedValueOnce(JSON.stringify(validTaxResponse)),
    };
    const result = await getTaxStrategyAdvice(taxRequest, client);
    expect(result.recommendations[0].source).toBe('llm');
    expect(client.sendMessage).toHaveBeenCalledTimes(2);
  });

  it('invalid JSON twice → fallback', async () => {
    const client: LlmClient = {
      sendMessage: vi.fn().mockResolvedValue('nope'),
    };
    const result = await getTaxStrategyAdvice(taxRequest, client);
    expect(result.recommendations.every((r) => r.source === 'fallback')).toBe(true);
  });

  it('LLM throws error → fallback', async () => {
    const client: LlmClient = {
      sendMessage: vi.fn().mockRejectedValue(new Error('Rate limit')),
    };
    const result = await getTaxStrategyAdvice(taxRequest, client);
    expect(result.recommendations.every((r) => r.source === 'fallback')).toBe(true);
  });

  it('no LlmClient → fallback', async () => {
    const result = await getTaxStrategyAdvice(taxRequest);
    expect(result.recommendations.every((r) => r.source === 'fallback')).toBe(true);
  });
});
