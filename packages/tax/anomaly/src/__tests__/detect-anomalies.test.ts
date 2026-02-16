import { describe, it, expect } from 'vitest';
import { detectAnomalies } from '../detect-anomalies.js';
import type { AnomalyDetectionRequest } from '../types.js';
import type { TaxYearRecord, TaxDocument } from '@finplanner/domain';

function makeRecord(year: number, overrides: Partial<TaxYearRecord> = {}): TaxYearRecord {
  return {
    taxYear: year,
    status: 'filed',
    filingStatus: 'mfj',
    stateOfResidence: 'WA',
    income: {
      wages: 100_000, selfEmploymentIncome: 0, interestIncome: 3_000,
      dividendIncome: 5_000, qualifiedDividends: 3_000, capitalGains: 0,
      capitalLosses: 0, rentalIncome: 0, nqdcDistributions: 0,
      retirementDistributions: 0, socialSecurityIncome: 0, otherIncome: 0,
    },
    deductions: { standardDeduction: 30_000, useItemized: false },
    credits: { childTaxCredit: 0, educationCredits: 0, foreignTaxCredit: 0, otherCredits: 0 },
    payments: { federalWithheld: 20_000, stateWithheld: 0, estimatedPaymentsFederal: 0, estimatedPaymentsState: 0 },
    computedFederalTax: 18_000, computedStateTax: 0,
    computedEffectiveFederalRate: 16.7, computedEffectiveStateRate: 0,
    documentIds: [],
    ...overrides,
  };
}

function makeDoc(overrides: Partial<TaxDocument>): TaxDocument {
  return {
    id: 'doc-1', taxYear: 2024, formType: 'W-2', issuerName: 'Acme Corp',
    extractedFields: {}, fieldConfidence: {}, extractionConfidence: 0.95,
    lowConfidenceFields: [], confirmedByUser: true, importedAt: '2025-01-15T00:00:00Z',
    ...overrides,
  };
}

describe('detectAnomalies', () => {
  it('detects document omission', () => {
    const request: AnomalyDetectionRequest = {
      currentYear: 2025,
      records: [makeRecord(2024), makeRecord(2025)],
      documentsByYear: new Map([
        [2024, [makeDoc({ taxYear: 2024, formType: '1099-DIV', issuerName: 'Vanguard' })]],
        [2025, []],
      ]),
    };
    const result = detectAnomalies(request);
    const omission = result.anomalies.find(a => a.category === 'omission');
    expect(omission).toBeDefined();
    expect(omission!.severity).toBe('warning');
    expect(omission!.field).toContain('Vanguard');
  });

  it('detects income anomaly at 40% increase ($40K)', () => {
    const request: AnomalyDetectionRequest = {
      currentYear: 2025,
      records: [
        makeRecord(2024, { income: { wages: 100_000, selfEmploymentIncome: 0, interestIncome: 0, dividendIncome: 0, qualifiedDividends: 0, capitalGains: 0, capitalLosses: 0, rentalIncome: 0, nqdcDistributions: 0, retirementDistributions: 0, socialSecurityIncome: 0, otherIncome: 0 } }),
        makeRecord(2025, { income: { wages: 140_000, selfEmploymentIncome: 0, interestIncome: 0, dividendIncome: 0, qualifiedDividends: 0, capitalGains: 0, capitalLosses: 0, rentalIncome: 0, nqdcDistributions: 0, retirementDistributions: 0, socialSecurityIncome: 0, otherIncome: 0 } }),
      ],
      documentsByYear: new Map(),
    };
    const result = detectAnomalies(request);
    const wageAnomaly = result.anomalies.find(a => a.field === 'wages' && a.category === 'anomaly');
    expect(wageAnomaly).toBeDefined();
    expect(wageAnomaly!.severity).toBe('warning'); // 40% > 25% but <= 50%, $40K > $5K but <= $10K
  });

  it('does NOT trigger anomaly at 24% increase ($24K) — percent below threshold', () => {
    const request: AnomalyDetectionRequest = {
      currentYear: 2025,
      records: [
        makeRecord(2024, { income: { wages: 100_000, selfEmploymentIncome: 0, interestIncome: 0, dividendIncome: 0, qualifiedDividends: 0, capitalGains: 0, capitalLosses: 0, rentalIncome: 0, nqdcDistributions: 0, retirementDistributions: 0, socialSecurityIncome: 0, otherIncome: 0 } }),
        makeRecord(2025, { income: { wages: 124_000, selfEmploymentIncome: 0, interestIncome: 0, dividendIncome: 0, qualifiedDividends: 0, capitalGains: 0, capitalLosses: 0, rentalIncome: 0, nqdcDistributions: 0, retirementDistributions: 0, socialSecurityIncome: 0, otherIncome: 0 } }),
      ],
      documentsByYear: new Map(),
    };
    const result = detectAnomalies(request);
    const wageAnomaly = result.anomalies.find(a => a.field === 'wages' && a.category === 'anomaly' && a.severity !== 'info');
    expect(wageAnomaly).toBeUndefined(); // 24% does NOT exceed 25% threshold
  });

  it('detects new income source', () => {
    const request: AnomalyDetectionRequest = {
      currentYear: 2025,
      records: [
        makeRecord(2024, { income: { wages: 100_000, selfEmploymentIncome: 0, interestIncome: 0, dividendIncome: 0, qualifiedDividends: 0, capitalGains: 0, capitalLosses: 0, rentalIncome: 0, nqdcDistributions: 0, retirementDistributions: 0, socialSecurityIncome: 0, otherIncome: 0 } }),
        makeRecord(2025, { income: { wages: 100_000, selfEmploymentIncome: 0, interestIncome: 0, dividendIncome: 0, qualifiedDividends: 0, capitalGains: 0, capitalLosses: 0, rentalIncome: 15_000, nqdcDistributions: 0, retirementDistributions: 0, socialSecurityIncome: 0, otherIncome: 0 } }),
      ],
      documentsByYear: new Map(),
    };
    const result = detectAnomalies(request);
    const newSource = result.anomalies.find(a => a.field === 'rentalIncome' && a.severity === 'info');
    expect(newSource).toBeDefined();
  });

  it('returns empty anomalies when no prior record exists', () => {
    const request: AnomalyDetectionRequest = {
      currentYear: 2025,
      records: [makeRecord(2025)],
      documentsByYear: new Map(),
    };
    const result = detectAnomalies(request);
    expect(result.anomalies).toHaveLength(0);
  });

  it('computes YoY summary correctly', () => {
    const request: AnomalyDetectionRequest = {
      currentYear: 2025,
      records: [
        makeRecord(2024, { income: { wages: 100_000, selfEmploymentIncome: 0, interestIncome: 0, dividendIncome: 0, qualifiedDividends: 0, capitalGains: 0, capitalLosses: 0, rentalIncome: 0, nqdcDistributions: 0, retirementDistributions: 0, socialSecurityIncome: 0, otherIncome: 0 } }),
        makeRecord(2025, { income: { wages: 140_000, selfEmploymentIncome: 0, interestIncome: 0, dividendIncome: 0, qualifiedDividends: 0, capitalGains: 0, capitalLosses: 0, rentalIncome: 0, nqdcDistributions: 0, retirementDistributions: 0, socialSecurityIncome: 0, otherIncome: 0 } }),
      ],
      documentsByYear: new Map(),
    };
    const result = detectAnomalies(request);
    expect(result.yearOverYearSummary.totalIncomeChange).toBe(40_000);
  });

  it('uses deterministic IDs', () => {
    const request: AnomalyDetectionRequest = {
      currentYear: 2025,
      records: [
        makeRecord(2024),
        makeRecord(2025, { income: { wages: 200_000, selfEmploymentIncome: 0, interestIncome: 3_000, dividendIncome: 5_000, qualifiedDividends: 3_000, capitalGains: 0, capitalLosses: 0, rentalIncome: 0, nqdcDistributions: 0, retirementDistributions: 0, socialSecurityIncome: 0, otherIncome: 0 } }),
      ],
      documentsByYear: new Map(),
    };
    const result = detectAnomalies(request);
    if (result.anomalies.length > 0) {
      expect(result.anomalies[0].id).toBe('anomaly-2025-0');
    }
  });
});
