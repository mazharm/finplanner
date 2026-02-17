import { describe, it, expect } from 'vitest';
import { stripPortfolioPii, stripTaxPii, stripDocumentsPii } from '../pii-strip.js';
import type { PortfolioAdviceRequest, TaxStrategyAdviceRequest, TaxDocument } from '@finplanner/domain';

function makePortfolioRequest(overrides?: Partial<PortfolioAdviceRequest>): PortfolioAdviceRequest {
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
        { id: 'a1', name: 'Fidelity Brokerage', type: 'taxable', owner: 'primary', currentBalance: 500_000, expectedReturnPct: 7, volatilityPct: 15, feePct: 0.1 },
        { id: 'a2', name: 'Vanguard 401k', type: 'taxDeferred', owner: 'primary', currentBalance: 800_000, expectedReturnPct: 7, volatilityPct: 15, feePct: 0.05 },
        { id: 'a3', name: 'Schwab Roth IRA', type: 'roth', owner: 'spouse', currentBalance: 200_000, expectedReturnPct: 7, volatilityPct: 15, feePct: 0.03 },
      ],
      otherIncome: [
        { id: 'i1', name: 'Company Pension', owner: 'primary', startYear: 2035, annualAmount: 30_000, taxable: true },
        { id: 'i2', name: 'Rental Income from 123 Main St', owner: 'joint', startYear: 2026, endYear: 2040, annualAmount: 24_000, taxable: true },
      ],
      adjustments: [],
      spending: { targetAnnualSpend: 80_000, inflationPct: 2.5, survivorSpendingAdjustmentPct: 75 },
      taxes: { federalModel: 'effective', stateModel: 'none', federalEffectiveRatePct: 22, capGainsRatePct: 15 },
      market: { simulationMode: 'deterministic' },
      strategy: { withdrawalOrder: 'taxOptimized', rebalanceFrequency: 'annual', guardrailsEnabled: false },
    },
    planResultSummary: { successProbability: 0.85, medianTerminalValue: 500_000, worstCaseShortfall: 50_000 },
    userPreferences: { riskTolerance: 'moderate', spendingFloor: 60_000, legacyGoal: 100_000 },
    ...overrides,
  };
}

function makeTaxRequest(overrides?: Partial<TaxStrategyAdviceRequest>): TaxStrategyAdviceRequest {
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
      documentIds: ['d1', 'd2'],
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
        { id: 'a1', name: 'Fidelity Brokerage', type: 'taxable', owner: 'primary', currentBalance: 500_000, expectedReturnPct: 7, volatilityPct: 15, feePct: 0.1 },
        { id: 'a2', name: 'Vanguard 401k', type: 'taxDeferred', owner: 'primary', currentBalance: 800_000, expectedReturnPct: 7, volatilityPct: 15, feePct: 0.05 },
      ],
      incomeStreams: [
        { id: 'i1', name: 'Company Pension', owner: 'primary', startYear: 2035, annualAmount: 30_000, taxable: true },
      ],
    },
    userPreferences: { prioritize: 'minimize_tax' },
    ...overrides,
  };
}

describe('stripPortfolioPii', () => {
  it('replaces Account.name with type-based labels', () => {
    const result = stripPortfolioPii(makePortfolioRequest());
    expect(result.accounts[0].label).toBe('Taxable Account 1');
    expect(result.accounts[1].label).toBe('Tax-Deferred Account 1');
    expect(result.accounts[2].label).toBe('Roth Account 1');
    // Original names must not appear
    const json = JSON.stringify(result);
    expect(json).not.toContain('Fidelity');
    expect(json).not.toContain('Vanguard');
    expect(json).not.toContain('Schwab');
  });

  it('replaces IncomeStream.name with generic labels', () => {
    const result = stripPortfolioPii(makePortfolioRequest());
    expect(result.incomeStreams[0].label).toBe('Income Stream 1');
    expect(result.incomeStreams[1].label).toBe('Income Stream 2');
    const json = JSON.stringify(result);
    expect(json).not.toContain('Company Pension');
    expect(json).not.toContain('123 Main St');
  });

  it('preserves filingStatus and stateOfResidence', () => {
    const result = stripPortfolioPii(makePortfolioRequest());
    expect(result.household.filingStatus).toBe('mfj');
    expect(result.household.stateOfResidence).toBe('WA');
  });

  it('preserves numeric fields (balances, rates, ages)', () => {
    const result = stripPortfolioPii(makePortfolioRequest());
    expect(result.accounts[0].currentBalance).toBe(500_000);
    expect(result.accounts[1].expectedReturnPct).toBe(7);
    expect(result.household.primary.currentAge).toBe(56);
    expect(result.simulationSummary.successProbability).toBe(0.85);
  });

  it('handles missing spouse (single filer)', () => {
    const request = makePortfolioRequest();
    request.planInput.household.maritalStatus = 'single';
    request.planInput.household.filingStatus = 'single';
    delete (request.planInput.household as unknown as Record<string, unknown>).spouse;
    const result = stripPortfolioPii(request);
    expect(result.household.spouse).toBeUndefined();
  });

  it('handles empty arrays (no accounts, no streams)', () => {
    const request = makePortfolioRequest();
    request.planInput.accounts = [];
    request.planInput.otherIncome = [];
    const result = stripPortfolioPii(request);
    expect(result.accounts).toEqual([]);
    expect(result.incomeStreams).toEqual([]);
  });
});

describe('stripTaxPii', () => {
  it('replaces account names with type-based labels', () => {
    const result = stripTaxPii(makeTaxRequest());
    expect(result.accounts[0].label).toBe('Taxable Account 1');
    expect(result.accounts[1].label).toBe('Tax-Deferred Account 1');
    const json = JSON.stringify(result);
    expect(json).not.toContain('Fidelity');
    expect(json).not.toContain('Vanguard');
  });

  it('preserves all numeric income/tax fields', () => {
    const result = stripTaxPii(makeTaxRequest());
    expect(result.income.wages).toBe(150_000);
    expect(result.computedFederalTax).toBe(35_000);
    expect(result.payments.federalWithheld).toBe(25_000);
  });
});

describe('stripDocumentsPii', () => {
  it('replaces issuerName with letter-indexed label', () => {
    const docs: TaxDocument[] = [
      { id: 'd1', taxYear: 2025, formType: 'W-2', issuerName: 'Acme Corp', sourceFileName: 'w2_acme.pdf', oneDrivePath: '/taxes/w2.pdf', extractedFields: { wages: 150_000 }, fieldConfidence: { wages: 0.95 }, extractionConfidence: 0.95, lowConfidenceFields: [], confirmedByUser: false, importedAt: '2025-03-01' },
      { id: 'd2', taxYear: 2025, formType: '1099-DIV', issuerName: 'Chase Bank', sourceFileName: 'chase_1099.pdf', oneDrivePath: '/taxes/1099.pdf', extractedFields: { dividends: 8_000 }, fieldConfidence: { dividends: 0.9 }, extractionConfidence: 0.9, lowConfidenceFields: [], confirmedByUser: false, importedAt: '2025-03-01' },
    ];
    const result = stripDocumentsPii(docs);
    expect(result[0].label).toBe('W-2 Issuer A');
    expect(result[1].label).toBe('1099-DIV Issuer B');
    const json = JSON.stringify(result);
    expect(json).not.toContain('Acme');
    expect(json).not.toContain('Chase');
    expect(json).not.toContain('sourceFileName');
    expect(json).not.toContain('oneDrivePath');
  });

  it('preserves extractedFields', () => {
    const docs: TaxDocument[] = [
      { id: 'd1', taxYear: 2025, formType: 'W-2', issuerName: 'Acme Corp', extractedFields: { wages: 150_000 }, fieldConfidence: { wages: 0.95 }, extractionConfidence: 0.95, lowConfidenceFields: [], confirmedByUser: false, importedAt: '2025-03-01' },
    ];
    const result = stripDocumentsPii(docs);
    expect(result[0].extractedFields).toEqual({ wages: 150_000 });
  });
});
