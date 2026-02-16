import { describe, it, expect } from 'vitest';
import { validatePortfolioResponse, validateTaxResponse } from '../response-validator.js';

const validPortfolioJson = JSON.stringify({
  recommendations: [
    { title: 'Test', rationale: 'Reason', expectedImpact: 'Impact', tradeoffs: ['t1'], source: 'llm' },
  ],
  withdrawalStrategyAdvice: [{ title: 'Strategy', rationale: 'Reason' }],
  riskFlags: ['Risk 1'],
  assumptionSensitivity: ['Sensitivity 1'],
  disclaimer: 'Disclaimer text',
});

const validTaxJson = JSON.stringify({
  recommendations: [
    { title: 'Test', rationale: 'Reason', expectedImpact: 'Impact', tradeoffs: ['t1'], source: 'llm' },
  ],
  taxOptimizationOpportunities: [{ title: 'Opportunity', rationale: 'Reason' }],
  riskFlags: ['Risk 1'],
  disclaimer: 'Disclaimer text',
});

describe('validatePortfolioResponse', () => {
  it('valid portfolio response passes', () => {
    const result = validatePortfolioResponse(validPortfolioJson);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.recommendations).toHaveLength(1);
      expect(result.data.disclaimer).toBe('Disclaimer text');
    }
  });

  it('invalid JSON returns error', () => {
    const result = validatePortfolioResponse('not json at all');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Invalid JSON');
    }
  });

  it('missing required fields returns error', () => {
    const result = validatePortfolioResponse(JSON.stringify({ recommendations: [] }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeTruthy();
    }
  });

  it('extra fields are tolerated', () => {
    const withExtra = JSON.parse(validPortfolioJson);
    withExtra.extraField = 'bonus';
    const result = validatePortfolioResponse(JSON.stringify(withExtra));
    expect(result.success).toBe(true);
  });

  it('empty recommendations array passes', () => {
    const empty = {
      recommendations: [],
      withdrawalStrategyAdvice: [],
      riskFlags: [],
      assumptionSensitivity: [],
      disclaimer: 'Disclaimer',
    };
    const result = validatePortfolioResponse(JSON.stringify(empty));
    expect(result.success).toBe(true);
  });
});

describe('validateTaxResponse', () => {
  it('valid tax response passes', () => {
    const result = validateTaxResponse(validTaxJson);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.recommendations).toHaveLength(1);
    }
  });

  it('invalid JSON returns error', () => {
    const result = validateTaxResponse('{broken');
    expect(result.success).toBe(false);
  });

  it('missing required fields returns error', () => {
    const result = validateTaxResponse(JSON.stringify({ recommendations: [] }));
    expect(result.success).toBe(false);
  });
});
