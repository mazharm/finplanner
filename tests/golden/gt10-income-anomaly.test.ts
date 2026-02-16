/**
 * GT10: Income Anomaly Detection
 *
 * Fixture: 2024 wages $100K, 2025 wages $140K (40% increase, $40K absolute).
 * Assert: anomaly category: "anomaly", severity: "warning" (>25% but <50%).
 * Negative: $100K→$124K (24%, $24K) must NOT trigger.
 */
import { describe, it, expect } from 'vitest';
import { detectAnomalies } from '@finplanner/tax-anomaly';
import type { TaxYearRecord, TaxYearIncome } from '@finplanner/domain';

function zeroIncome(): TaxYearIncome {
  return {
    wages: 0, selfEmploymentIncome: 0, interestIncome: 0,
    dividendIncome: 0, qualifiedDividends: 0, capitalGains: 0,
    capitalLosses: 0, rentalIncome: 0, nqdcDistributions: 0,
    retirementDistributions: 0, socialSecurityIncome: 0, otherIncome: 0,
  };
}

function makeRecord(year: number, wages: number): TaxYearRecord {
  return {
    taxYear: year,
    status: 'filed',
    filingStatus: 'mfj',
    stateOfResidence: 'WA',
    income: { ...zeroIncome(), wages },
    deductions: { standardDeduction: 30_000, useItemized: false },
    credits: { childTaxCredit: 0, educationCredits: 0, foreignTaxCredit: 0, otherCredits: 0 },
    payments: { federalWithheld: 20_000, stateWithheld: 0, estimatedPaymentsFederal: 0, estimatedPaymentsState: 0 },
    computedFederalTax: 18_000, computedStateTax: 0,
    computedEffectiveFederalRate: 16.7, computedEffectiveStateRate: 0,
    documentIds: [],
  };
}

describe('GT10: Income Anomaly Detection', () => {
  describe('40% increase ($100K → $140K)', () => {
    const result = detectAnomalies({
      currentYear: 2025,
      records: [makeRecord(2024, 100_000), makeRecord(2025, 140_000)],
      documentsByYear: new Map(),
    });

    it('should detect a wage anomaly', () => {
      const wageAnomaly = result.anomalies.find(
        a => a.field === 'wages' && a.category === 'anomaly'
      );
      expect(wageAnomaly).toBeDefined();
    });

    it('should have severity "warning" (40% > 25% but ≤ 50%)', () => {
      const wageAnomaly = result.anomalies.find(
        a => a.field === 'wages' && a.category === 'anomaly'
      );
      expect(wageAnomaly!.severity).toBe('warning');
    });

    it('should have percentChange ~40%', () => {
      const wageAnomaly = result.anomalies.find(
        a => a.field === 'wages' && a.category === 'anomaly'
      );
      expect(wageAnomaly!.percentChange).toBeCloseTo(40, 0);
    });

    it('should report $40K income change in YoY summary', () => {
      expect(result.yearOverYearSummary.totalIncomeChange).toBe(40_000);
    });
  });

  describe('24% increase ($100K → $124K) — must NOT trigger', () => {
    const result = detectAnomalies({
      currentYear: 2025,
      records: [makeRecord(2024, 100_000), makeRecord(2025, 124_000)],
      documentsByYear: new Map(),
    });

    it('should NOT detect a wage anomaly (24% < 25% threshold)', () => {
      const wageAnomaly = result.anomalies.find(
        a => a.field === 'wages' && a.category === 'anomaly' && a.severity !== 'info'
      );
      expect(wageAnomaly).toBeUndefined();
    });

    it('should report $24K income change in YoY summary', () => {
      expect(result.yearOverYearSummary.totalIncomeChange).toBe(24_000);
    });
  });
});
