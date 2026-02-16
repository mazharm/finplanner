import { describe, it, expect } from 'vitest';
import { identifyFormType } from '../identify-form.js';

describe('identifyFormType', () => {
  it('identifies W-2 from text containing W-2 identifiers', () => {
    const text = 'Form W-2 Wage and Tax Statement 2025\nEmployer: Acme Corp\nBox 1 Wages $80,000.00';
    const result = identifyFormType(text);
    expect(result).not.toBeNull();
    expect(result!.formType).toBe('W-2');
    expect(result!.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it('identifies 1099-INT', () => {
    const text = 'Form 1099-INT Interest Income\nPayer: Chase Bank\nBox 1 Interest income $2,500.00';
    const result = identifyFormType(text);
    expect(result).not.toBeNull();
    expect(result!.formType).toBe('1099-INT');
  });

  it('identifies 1099-DIV', () => {
    const text = '1099-DIV Dividends and Distributions\nPayer: Vanguard\nTotal ordinary dividends $8,000.00';
    const result = identifyFormType(text);
    expect(result!.formType).toBe('1099-DIV');
  });

  it('identifies K-1', () => {
    const text = "Schedule K-1 Partner's Share of Income\nPartnership: ABC LLC";
    const result = identifyFormType(text);
    expect(result!.formType).toBe('K-1');
  });

  it('returns null for unrecognized text', () => {
    const result = identifyFormType('This is just random text with no tax form identifiers');
    expect(result).toBeNull();
  });

  it('identifies 1099-NEC', () => {
    const text = 'Form 1099-NEC Nonemployee Compensation\nPayer: Client Co\nBox 1 $15,000.00';
    const result = identifyFormType(text);
    expect(result!.formType).toBe('1099-NEC');
  });
});
