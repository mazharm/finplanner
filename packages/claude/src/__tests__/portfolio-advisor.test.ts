import { describe, it, expect, vi } from 'vitest';
import { getPortfolioAdvice } from '../portfolio-advisor.js';
import type { PortfolioAdviceRequest, PortfolioAdviceResponse } from '@finplanner/domain';
import type { LlmClient } from '../types.js';

function makeRequest(): PortfolioAdviceRequest {
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
  };
}

const validResponse: PortfolioAdviceResponse = {
  recommendations: [
    { title: 'LLM Rec', rationale: 'LLM analysis', expectedImpact: 'Significant', tradeoffs: ['Trade1'], source: 'llm' },
  ],
  withdrawalStrategyAdvice: [{ title: 'Strategy', rationale: 'Reason' }],
  riskFlags: ['Risk'],
  assumptionSensitivity: ['Sensitivity'],
  disclaimer: 'LLM disclaimer',
};

describe('getPortfolioAdvice', () => {
  it('no client → returns fallback immediately', async () => {
    const result = await getPortfolioAdvice(makeRequest());
    expect(result.recommendations.every((r) => r.source === 'fallback')).toBe(true);
  });

  it('valid LLM response → returns parsed advice', async () => {
    const client: LlmClient = {
      sendMessage: vi.fn().mockResolvedValue(JSON.stringify(validResponse)),
    };
    const result = await getPortfolioAdvice(makeRequest(), client);
    expect(result.recommendations[0].source).toBe('llm');
    expect(result.recommendations[0].title).toBe('LLM Rec');
  });

  it('invalid first response → retries once → valid retry → returns retry result', async () => {
    const client: LlmClient = {
      sendMessage: vi
        .fn()
        .mockResolvedValueOnce('not json')
        .mockResolvedValueOnce(JSON.stringify(validResponse)),
    };
    const result = await getPortfolioAdvice(makeRequest(), client);
    expect(result.recommendations[0].source).toBe('llm');
    expect(client.sendMessage).toHaveBeenCalledTimes(2);
  });

  it('invalid both responses → returns fallback', async () => {
    const client: LlmClient = {
      sendMessage: vi.fn().mockResolvedValue('still not valid json'),
    };
    const result = await getPortfolioAdvice(makeRequest(), client);
    expect(result.recommendations.every((r) => r.source === 'fallback')).toBe(true);
  });

  it('LLM throws error → returns fallback', async () => {
    const client: LlmClient = {
      sendMessage: vi.fn().mockRejectedValue(new Error('API error')),
    };
    const result = await getPortfolioAdvice(makeRequest(), client);
    expect(result.recommendations.every((r) => r.source === 'fallback')).toBe(true);
  });
});
