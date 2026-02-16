import { describe, it, expect, vi } from 'vitest';
import { getTaxStrategyAdvice } from '../tax-advisor.js';
import type { TaxStrategyAdviceRequest, TaxStrategyAdviceResponse } from '@finplanner/domain';
import type { LlmClient } from '../types.js';

function makeRequest(): TaxStrategyAdviceRequest {
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
  };
}

const validResponse: TaxStrategyAdviceResponse = {
  recommendations: [
    { title: 'LLM Tax Rec', rationale: 'LLM analysis', expectedImpact: 'Significant', tradeoffs: ['Trade1'], source: 'llm' },
  ],
  taxOptimizationOpportunities: [{ title: 'Opportunity', rationale: 'Reason' }],
  riskFlags: ['Risk'],
  disclaimer: 'LLM tax disclaimer',
};

describe('getTaxStrategyAdvice', () => {
  it('no client → returns fallback immediately', async () => {
    const result = await getTaxStrategyAdvice(makeRequest());
    expect(result.recommendations.every((r) => r.source === 'fallback')).toBe(true);
  });

  it('valid LLM response → returns parsed advice', async () => {
    const client: LlmClient = {
      sendMessage: vi.fn().mockResolvedValue(JSON.stringify(validResponse)),
    };
    const result = await getTaxStrategyAdvice(makeRequest(), client);
    expect(result.recommendations[0].source).toBe('llm');
    expect(result.recommendations[0].title).toBe('LLM Tax Rec');
  });

  it('invalid first response → retries once → valid retry → returns retry result', async () => {
    const client: LlmClient = {
      sendMessage: vi
        .fn()
        .mockResolvedValueOnce('not json')
        .mockResolvedValueOnce(JSON.stringify(validResponse)),
    };
    const result = await getTaxStrategyAdvice(makeRequest(), client);
    expect(result.recommendations[0].source).toBe('llm');
    expect(client.sendMessage).toHaveBeenCalledTimes(2);
  });

  it('invalid both responses → returns fallback', async () => {
    const client: LlmClient = {
      sendMessage: vi.fn().mockResolvedValue('not valid'),
    };
    const result = await getTaxStrategyAdvice(makeRequest(), client);
    expect(result.recommendations.every((r) => r.source === 'fallback')).toBe(true);
  });

  it('LLM throws error → returns fallback', async () => {
    const client: LlmClient = {
      sendMessage: vi.fn().mockRejectedValue(new Error('API error')),
    };
    const result = await getTaxStrategyAdvice(makeRequest(), client);
    expect(result.recommendations.every((r) => r.source === 'fallback')).toBe(true);
  });
});
