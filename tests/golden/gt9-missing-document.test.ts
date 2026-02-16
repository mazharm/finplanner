/**
 * GT9: Missing Document Detection
 *
 * Fixture: 2024 filed has 1099-DIV from "Vanguard". 2025 draft has no
 * Vanguard 1099-DIV.
 *
 * Assert: detectAnomalies() → omission anomaly, severity: "warning",
 * field references Vanguard. generateChecklist(2025) → Vanguard item
 * status: "pending", completionPct < 100.
 */
import { describe, it, expect } from 'vitest';
import { detectAnomalies } from '@finplanner/tax-anomaly';
import { generateChecklist } from '@finplanner/tax-checklist';
import type { TaxYearRecord, TaxDocument } from '@finplanner/domain';

const record2024: TaxYearRecord = {
  taxYear: 2024,
  status: 'filed',
  filingStatus: 'mfj',
  stateOfResidence: 'WA',
  income: {
    wages: 150_000, selfEmploymentIncome: 0, interestIncome: 3_000,
    dividendIncome: 8_000, qualifiedDividends: 6_000, capitalGains: 0,
    capitalLosses: 0, rentalIncome: 0, nqdcDistributions: 0,
    retirementDistributions: 0, socialSecurityIncome: 0, otherIncome: 0,
  },
  deductions: { standardDeduction: 30_000, useItemized: false },
  credits: { childTaxCredit: 0, educationCredits: 0, foreignTaxCredit: 0, otherCredits: 0 },
  payments: { federalWithheld: 28_000, stateWithheld: 0, estimatedPaymentsFederal: 0, estimatedPaymentsState: 0 },
  computedFederalTax: 25_000, computedStateTax: 0,
  computedEffectiveFederalRate: 15.5, computedEffectiveStateRate: 0,
  documentIds: ['doc-w2-2024', 'doc-div-2024'],
};

const record2025: TaxYearRecord = {
  taxYear: 2025,
  status: 'draft',
  filingStatus: 'mfj',
  stateOfResidence: 'WA',
  income: {
    wages: 150_000, selfEmploymentIncome: 0, interestIncome: 3_000,
    dividendIncome: 0, qualifiedDividends: 0, capitalGains: 0,
    capitalLosses: 0, rentalIncome: 0, nqdcDistributions: 0,
    retirementDistributions: 0, socialSecurityIncome: 0, otherIncome: 0,
  },
  deductions: { standardDeduction: 30_000, useItemized: false },
  credits: { childTaxCredit: 0, educationCredits: 0, foreignTaxCredit: 0, otherCredits: 0 },
  payments: { federalWithheld: 28_000, stateWithheld: 0, estimatedPaymentsFederal: 0, estimatedPaymentsState: 0 },
  computedFederalTax: 0, computedStateTax: 0,
  computedEffectiveFederalRate: 0, computedEffectiveStateRate: 0,
  documentIds: ['doc-w2-2025'],
};

const docs2024: TaxDocument[] = [
  {
    id: 'doc-w2-2024', taxYear: 2024, formType: 'W-2', issuerName: 'Acme Corp',
    extractedFields: { wages: 150_000 }, fieldConfidence: { wages: 1.0 },
    extractionConfidence: 0.95, lowConfidenceFields: [], confirmedByUser: true,
    importedAt: '2025-02-01T00:00:00Z',
  },
  {
    id: 'doc-div-2024', taxYear: 2024, formType: '1099-DIV', issuerName: 'Vanguard',
    extractedFields: { ordinaryDividends: 8_000 }, fieldConfidence: { ordinaryDividends: 1.0 },
    extractionConfidence: 0.95, lowConfidenceFields: [], confirmedByUser: true,
    importedAt: '2025-02-01T00:00:00Z',
  },
];

const docs2025: TaxDocument[] = [
  {
    id: 'doc-w2-2025', taxYear: 2025, formType: 'W-2', issuerName: 'Acme Corp',
    extractedFields: { wages: 150_000 }, fieldConfidence: { wages: 1.0 },
    extractionConfidence: 0.95, lowConfidenceFields: [], confirmedByUser: true,
    importedAt: '2026-02-01T00:00:00Z',
  },
];

describe('GT9: Missing Document Detection', () => {
  const anomalyResult = detectAnomalies({
    currentYear: 2025,
    records: [record2024, record2025],
    documentsByYear: new Map([
      [2024, docs2024],
      [2025, docs2025],
    ]),
  });

  const checklist = generateChecklist({
    taxYear: 2025,
    currentYearRecord: record2025,
    priorYearRecord: record2024,
    priorYearDocuments: docs2024,
    currentYearDocuments: docs2025,
    sharedCorpus: {
      household: {
        maritalStatus: 'married', filingStatus: 'mfj', stateOfResidence: 'WA',
        primary: { id: 'primary', birthYear: 1980, currentAge: 45, retirementAge: 65, lifeExpectancy: 90 },
      },
      accounts: [],
      incomeStreams: [],
    },
  });

  it('should detect Vanguard 1099-DIV omission via detectAnomalies', () => {
    const omission = anomalyResult.anomalies.find(a => a.category === 'omission');
    expect(omission).toBeDefined();
    expect(omission!.severity).toBe('warning');
    expect(omission!.field).toContain('Vanguard');
    expect(omission!.field).toContain('1099-DIV');
  });

  it('should have Vanguard checklist item as pending', () => {
    const vanguardItem = checklist.items.find(
      i => i.category === 'document' && i.description.includes('Vanguard')
    );
    expect(vanguardItem).toBeDefined();
    expect(vanguardItem!.status).toBe('pending');
  });

  it('should have W-2 from Acme Corp as received', () => {
    const w2Item = checklist.items.find(
      i => i.category === 'document' && i.description.includes('Acme Corp')
    );
    expect(w2Item).toBeDefined();
    expect(w2Item!.status).toBe('received');
  });

  it('should have completionPct < 100', () => {
    expect(checklist.completionPct).toBeLessThan(100);
  });
});
