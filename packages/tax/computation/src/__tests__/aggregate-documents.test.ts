import { describe, it, expect } from 'vitest';
import { aggregateDocumentsToIncome } from '../aggregate-documents.js';
import type { TaxDocument } from '@finplanner/domain';

function makeDoc(overrides: Partial<TaxDocument>): TaxDocument {
  return {
    id: 'doc-1',
    taxYear: 2025,
    formType: 'W-2',
    issuerName: 'Test Corp',
    extractedFields: {},
    fieldConfidence: {},
    extractionConfidence: 0.95,
    lowConfidenceFields: [],
    confirmedByUser: true,
    importedAt: '2025-03-01T00:00:00Z',
    ...overrides,
  };
}

describe('aggregateDocumentsToIncome', () => {
  it('aggregates W-2 wages and withholding from multiple employers', () => {
    const docs = [
      makeDoc({ id: 'w2-1', formType: 'W-2', issuerName: 'Employer A', extractedFields: { wages: 80_000, federalTaxWithheld: 15_000, stateTaxWithheld: 3_000 } }),
      makeDoc({ id: 'w2-2', formType: 'W-2', issuerName: 'Employer B', extractedFields: { wages: 45_000, federalTaxWithheld: 8_000 } }),
    ];
    const result = aggregateDocumentsToIncome(docs);
    expect(result.income.wages).toBe(125_000);
    expect(result.payments.federalWithheld).toBe(23_000);
    expect(result.payments.stateWithheld).toBe(3_000);
  });

  it('aggregates 1099-DIV fields correctly', () => {
    const docs = [
      makeDoc({ formType: '1099-DIV', extractedFields: { ordinaryDividends: 5_000, qualifiedDividends: 3_000, capitalGainDistributions: 1_000 } }),
    ];
    const result = aggregateDocumentsToIncome(docs);
    expect(result.income.dividendIncome).toBe(5_000);
    expect(result.income.qualifiedDividends).toBe(3_000);
    expect(result.income.capitalGains).toBe(1_000);
  });

  it('splits 1099-B gains and losses', () => {
    const docs = [
      makeDoc({ formType: '1099-B', extractedFields: { gainLoss: 5_000 } }),
      makeDoc({ formType: '1099-B', extractedFields: { gainLoss: -2_000 } }),
    ];
    const result = aggregateDocumentsToIncome(docs);
    expect(result.income.capitalGains).toBe(5_000);
    expect(result.income.capitalLosses).toBe(2_000);
  });

  it('aggregates K-1 fields', () => {
    const docs = [
      makeDoc({ formType: 'K-1', extractedFields: { ordinaryIncome: 10_000, rentalIncome: 5_000, capitalGains: 3_000 } }),
    ];
    const result = aggregateDocumentsToIncome(docs);
    expect(result.income.otherIncome).toBe(10_000);
    expect(result.income.rentalIncome).toBe(5_000);
    expect(result.income.capitalGains).toBe(3_000);
  });

  it('returns empty partials for no documents', () => {
    const result = aggregateDocumentsToIncome([]);
    expect(result.income).toEqual({});
    expect(result.payments).toEqual({});
  });
});
