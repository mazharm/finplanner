import { describe, it, expect } from 'vitest';
import { generateChecklist } from '../generate-checklist.js';
import type { ChecklistRequest } from '../types.js';
import type { TaxDocument, TaxYearRecord } from '@finplanner/domain';

function makeRecord(year: number, overrides: Partial<TaxYearRecord> = {}): TaxYearRecord {
  return {
    taxYear: year,
    status: 'draft',
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
    payments: { federalWithheld: 25_000, stateWithheld: 0, estimatedPaymentsFederal: 0, estimatedPaymentsState: 0 },
    computedFederalTax: 0, computedStateTax: 0,
    computedEffectiveFederalRate: 0, computedEffectiveStateRate: 0,
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

describe('generateChecklist', () => {
  it('marks matched prior-year documents as received', () => {
    const request: ChecklistRequest = {
      taxYear: 2025,
      currentYearRecord: makeRecord(2025),
      priorYearRecord: makeRecord(2024, { status: 'filed' }),
      priorYearDocuments: [makeDoc({ taxYear: 2024, formType: 'W-2', issuerName: 'Acme Corp' })],
      currentYearDocuments: [makeDoc({ id: 'doc-2025', taxYear: 2025, formType: 'W-2', issuerName: 'Acme Corp' })],
      sharedCorpus: { household: { maritalStatus: 'married', filingStatus: 'mfj', stateOfResidence: 'WA', primary: { id: 'primary', birthYear: 1980, currentAge: 45, retirementAge: 65, lifeExpectancy: 90 } }, accounts: [], incomeStreams: [] },
    };
    const result = generateChecklist(request);
    const docItem = result.items.find(i => i.category === 'document');
    expect(docItem?.status).toBe('received');
    expect(docItem?.linkedDocumentId).toBe('doc-2025');
  });

  it('marks missing prior-year documents as pending', () => {
    const request: ChecklistRequest = {
      taxYear: 2025,
      currentYearRecord: makeRecord(2025),
      priorYearRecord: makeRecord(2024, { status: 'filed' }),
      priorYearDocuments: [makeDoc({ taxYear: 2024, formType: '1099-DIV', issuerName: 'Vanguard' })],
      currentYearDocuments: [],
      sharedCorpus: { household: { maritalStatus: 'married', filingStatus: 'mfj', stateOfResidence: 'WA', primary: { id: 'primary', birthYear: 1980, currentAge: 45, retirementAge: 65, lifeExpectancy: 90 } }, accounts: [], incomeStreams: [] },
    };
    const result = generateChecklist(request);
    const docItem = result.items.find(i => i.category === 'document');
    expect(docItem?.status).toBe('pending');
    expect(result.completionPct).toBeLessThan(100);
  });

  it('generates taxable account income items', () => {
    const request: ChecklistRequest = {
      taxYear: 2025,
      currentYearRecord: makeRecord(2025),
      priorYearDocuments: [],
      currentYearDocuments: [],
      sharedCorpus: {
        household: { maritalStatus: 'married', filingStatus: 'mfj', stateOfResidence: 'WA', primary: { id: 'primary', birthYear: 1980, currentAge: 45, retirementAge: 65, lifeExpectancy: 90 } },
        accounts: [{ id: 'acct-1', name: 'Brokerage', type: 'taxable', owner: 'primary', currentBalance: 500_000, expectedReturnPct: 6, feePct: 0.1 }],
        incomeStreams: [],
      },
    };
    const result = generateChecklist(request);
    const incomeItem = result.items.find(i => i.category === 'income' && i.description.includes('Brokerage'));
    expect(incomeItem).toBeDefined();
  });

  it('always includes filing deadline', () => {
    const request: ChecklistRequest = {
      taxYear: 2025,
      currentYearRecord: makeRecord(2025),
      priorYearDocuments: [],
      currentYearDocuments: [],
      sharedCorpus: { household: { maritalStatus: 'married', filingStatus: 'mfj', stateOfResidence: 'WA', primary: { id: 'primary', birthYear: 1980, currentAge: 45, retirementAge: 65, lifeExpectancy: 90 } }, accounts: [], incomeStreams: [] },
    };
    const result = generateChecklist(request);
    const deadline = result.items.find(i => i.category === 'deadline');
    expect(deadline).toBeDefined();
    expect(deadline!.description).toContain('April 15, 2026');
  });

  it('completionPct is 100 when all items are received', () => {
    const request: ChecklistRequest = {
      taxYear: 2025,
      currentYearRecord: makeRecord(2025),
      priorYearRecord: makeRecord(2024, { status: 'filed' }),
      priorYearDocuments: [
        makeDoc({ taxYear: 2024, formType: 'W-2', issuerName: 'Acme Corp' }),
        makeDoc({ id: 'doc-div', taxYear: 2024, formType: '1099-DIV', issuerName: 'Vanguard' }),
      ],
      currentYearDocuments: [
        makeDoc({ id: 'doc-w2-2025', taxYear: 2025, formType: 'W-2', issuerName: 'Acme Corp' }),
        makeDoc({ id: 'doc-div-2025', taxYear: 2025, formType: '1099-DIV', issuerName: 'Vanguard' }),
      ],
      sharedCorpus: { household: { maritalStatus: 'married', filingStatus: 'mfj', stateOfResidence: 'WA', primary: { id: 'primary', birthYear: 1980, currentAge: 45, retirementAge: 65, lifeExpectancy: 90 } }, accounts: [], incomeStreams: [] },
    };
    const result = generateChecklist(request);
    // doc items are "received", deadline is "pending"
    const docItems = result.items.filter(i => i.category === 'document');
    expect(docItems.every(i => i.status === 'received')).toBe(true);
  });

  it('generates filing status change item', () => {
    const request: ChecklistRequest = {
      taxYear: 2025,
      currentYearRecord: makeRecord(2025, { filingStatus: 'single' }),
      priorYearRecord: makeRecord(2024, { filingStatus: 'mfj', status: 'filed' }),
      priorYearDocuments: [],
      currentYearDocuments: [],
      sharedCorpus: { household: { maritalStatus: 'single', filingStatus: 'single', stateOfResidence: 'WA', primary: { id: 'primary', birthYear: 1980, currentAge: 45, retirementAge: 65, lifeExpectancy: 90 } }, accounts: [], incomeStreams: [] },
    };
    const result = generateChecklist(request);
    const lifeEvent = result.items.find(i => i.category === 'life_event' && i.description.includes('Filing status'));
    expect(lifeEvent).toBeDefined();
  });

  it('generates deduction review items for prior itemized deductions', () => {
    const request: ChecklistRequest = {
      taxYear: 2025,
      currentYearRecord: makeRecord(2025),
      priorYearRecord: makeRecord(2024, {
        status: 'filed',
        deductions: {
          standardDeduction: 30_000,
          useItemized: true,
          itemizedDeductions: { mortgageInterest: 15_000, stateAndLocalTaxes: 10_000, charitableContributions: 5_000, medicalExpenses: 0, other: 0 },
        },
      }),
      priorYearDocuments: [],
      currentYearDocuments: [],
      sharedCorpus: { household: { maritalStatus: 'married', filingStatus: 'mfj', stateOfResidence: 'WA', primary: { id: 'primary', birthYear: 1980, currentAge: 45, retirementAge: 65, lifeExpectancy: 90 } }, accounts: [], incomeStreams: [] },
    };
    const result = generateChecklist(request);
    const deductionItems = result.items.filter(i => i.category === 'deduction');
    expect(deductionItems.length).toBe(3); // mortgage, SALT, charitable (not medical=0, not other=0)
  });

  it('uses deterministic IDs', () => {
    const request: ChecklistRequest = {
      taxYear: 2025,
      currentYearRecord: makeRecord(2025),
      priorYearDocuments: [],
      currentYearDocuments: [],
      sharedCorpus: { household: { maritalStatus: 'married', filingStatus: 'mfj', stateOfResidence: 'WA', primary: { id: 'primary', birthYear: 1980, currentAge: 45, retirementAge: 65, lifeExpectancy: 90 } }, accounts: [], incomeStreams: [] },
    };
    const result = generateChecklist(request);
    expect(result.items[0].id).toBe('checklist-2025-0');
  });
});
