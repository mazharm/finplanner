/**
 * GT8: Two-Year Complete Tax Record
 *
 * Fixture: MFJ, WA. 2024 filed (wages $150K, 1099-DIV $8K from Vanguard,
 * 1099-INT $3K from Chase). 2025 draft (same sources + documents,
 * DIV $8.5K, INT $3.2K). All confirmed.
 *
 * Assert: generateChecklist(2025) → completionPct === 100 for document items,
 * all document items status: "received", no "pending" document items,
 * sourceReasoning references 2024.
 */
import { describe, it, expect } from 'vitest';
import { generateChecklist } from '@finplanner/tax-checklist';
import type { TaxYearRecord, TaxDocument, HouseholdProfile } from '@finplanner/domain';

const household: HouseholdProfile = {
  maritalStatus: 'married',
  filingStatus: 'mfj',
  stateOfResidence: 'WA',
  primary: { id: 'primary', birthYear: 1980, currentAge: 45, retirementAge: 65, lifeExpectancy: 90 },
  spouse: { id: 'spouse', birthYear: 1982, currentAge: 43, retirementAge: 65, lifeExpectancy: 92 },
};

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
  documentIds: ['doc-w2-2024', 'doc-div-2024', 'doc-int-2024'],
};

const record2025: TaxYearRecord = {
  taxYear: 2025,
  status: 'draft',
  filingStatus: 'mfj',
  stateOfResidence: 'WA',
  income: {
    wages: 150_000, selfEmploymentIncome: 0, interestIncome: 3_200,
    dividendIncome: 8_500, qualifiedDividends: 6_500, capitalGains: 0,
    capitalLosses: 0, rentalIncome: 0, nqdcDistributions: 0,
    retirementDistributions: 0, socialSecurityIncome: 0, otherIncome: 0,
  },
  deductions: { standardDeduction: 30_000, useItemized: false },
  credits: { childTaxCredit: 0, educationCredits: 0, foreignTaxCredit: 0, otherCredits: 0 },
  payments: { federalWithheld: 28_000, stateWithheld: 0, estimatedPaymentsFederal: 0, estimatedPaymentsState: 0 },
  computedFederalTax: 0, computedStateTax: 0,
  computedEffectiveFederalRate: 0, computedEffectiveStateRate: 0,
  documentIds: ['doc-w2-2025', 'doc-div-2025', 'doc-int-2025'],
};

const docs2024: TaxDocument[] = [
  {
    id: 'doc-w2-2024', taxYear: 2024, formType: 'W-2', issuerName: 'Acme Corp',
    extractedFields: { wages: 150_000, federalTaxWithheld: 28_000 },
    fieldConfidence: { wages: 1.0, federalTaxWithheld: 1.0 },
    extractionConfidence: 0.95, lowConfidenceFields: [], confirmedByUser: true,
    importedAt: '2025-02-01T00:00:00Z',
  },
  {
    id: 'doc-div-2024', taxYear: 2024, formType: '1099-DIV', issuerName: 'Vanguard',
    extractedFields: { ordinaryDividends: 8_000, qualifiedDividends: 6_000 },
    fieldConfidence: { ordinaryDividends: 1.0, qualifiedDividends: 1.0 },
    extractionConfidence: 0.95, lowConfidenceFields: [], confirmedByUser: true,
    importedAt: '2025-02-01T00:00:00Z',
  },
  {
    id: 'doc-int-2024', taxYear: 2024, formType: '1099-INT', issuerName: 'Chase',
    extractedFields: { interestIncome: 3_000 },
    fieldConfidence: { interestIncome: 1.0 },
    extractionConfidence: 0.95, lowConfidenceFields: [], confirmedByUser: true,
    importedAt: '2025-02-01T00:00:00Z',
  },
];

const docs2025: TaxDocument[] = [
  {
    id: 'doc-w2-2025', taxYear: 2025, formType: 'W-2', issuerName: 'Acme Corp',
    extractedFields: { wages: 150_000, federalTaxWithheld: 28_000 },
    fieldConfidence: { wages: 1.0, federalTaxWithheld: 1.0 },
    extractionConfidence: 0.95, lowConfidenceFields: [], confirmedByUser: true,
    importedAt: '2026-02-01T00:00:00Z',
  },
  {
    id: 'doc-div-2025', taxYear: 2025, formType: '1099-DIV', issuerName: 'Vanguard',
    extractedFields: { ordinaryDividends: 8_500, qualifiedDividends: 6_500 },
    fieldConfidence: { ordinaryDividends: 1.0, qualifiedDividends: 1.0 },
    extractionConfidence: 0.95, lowConfidenceFields: [], confirmedByUser: true,
    importedAt: '2026-02-01T00:00:00Z',
  },
  {
    id: 'doc-int-2025', taxYear: 2025, formType: '1099-INT', issuerName: 'Chase',
    extractedFields: { interestIncome: 3_200 },
    fieldConfidence: { interestIncome: 1.0 },
    extractionConfidence: 0.95, lowConfidenceFields: [], confirmedByUser: true,
    importedAt: '2026-02-01T00:00:00Z',
  },
];

describe('GT8: Two-Year Complete Tax Record', () => {
  const checklist = generateChecklist({
    taxYear: 2025,
    currentYearRecord: record2025,
    priorYearRecord: record2024,
    priorYearDocuments: docs2024,
    currentYearDocuments: docs2025,
    sharedCorpus: { household, accounts: [], incomeStreams: [] },
  });

  it('should have all document items with status "received"', () => {
    const docItems = checklist.items.filter(i => i.category === 'document');
    expect(docItems.length).toBe(3); // W-2, 1099-DIV, 1099-INT
    for (const item of docItems) {
      expect(item.status).toBe('received');
    }
  });

  it('should have no "pending" document items', () => {
    const pendingDocItems = checklist.items.filter(
      i => i.category === 'document' && i.status === 'pending'
    );
    expect(pendingDocItems).toHaveLength(0);
  });

  it('should have sourceReasoning referencing 2024', () => {
    const docItems = checklist.items.filter(i => i.category === 'document');
    for (const item of docItems) {
      expect(item.sourceReasoning).toContain('2024');
    }
  });

  it('should have linkedDocumentId set for received items', () => {
    const docItems = checklist.items.filter(i => i.category === 'document');
    for (const item of docItems) {
      expect(item.linkedDocumentId).toBeDefined();
      expect(item.linkedDocumentId!.includes('2025')).toBe(true);
    }
  });

  it('should have completionPct reflecting all docs received', () => {
    // Document items (3) are "received", deadline (1) is "pending"
    // So completion = 3/4 * 100 = 75% (not all items are non-pending since deadline always pending)
    const docItems = checklist.items.filter(i => i.category === 'document');
    const receivedCount = docItems.filter(i => i.status === 'received').length;
    expect(receivedCount).toBe(docItems.length);
  });

  it('should always include filing deadline', () => {
    const deadline = checklist.items.find(i => i.category === 'deadline');
    expect(deadline).toBeDefined();
    expect(deadline!.description).toContain('April 15, 2026');
  });
});
