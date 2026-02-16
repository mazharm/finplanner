import { describe, it, expect } from 'vitest';
import { stripPortfolioPii, stripTaxPii, stripDocumentsPii, buildPortfolioPrompt, buildTaxPrompt } from '@finplanner/claude';
import type { PortfolioAdviceRequest, TaxStrategyAdviceRequest, TaxDocument } from '@finplanner/domain';

// ── Fixtures ──

const PII_ACCOUNT_NAMES = ['Fidelity Brokerage', 'Vanguard 401k', 'Schwab Roth IRA'];
const PII_INCOME_NAMES = ['Company Pension', 'Rental Income from 123 Main St'];
const PII_ISSUER_NAMES = ['Acme Corp', 'Chase Bank'];

const portfolioRequest: PortfolioAdviceRequest = {
  planInput: {
    schemaVersion: '3.0.0',
    household: {
      maritalStatus: 'married',
      filingStatus: 'mfj',
      stateOfResidence: 'CA',
      primary: { id: 'primary', birthYear: 1968, currentAge: 58, retirementAge: 67, lifeExpectancy: 90 },
      spouse: { id: 'spouse', birthYear: 1970, currentAge: 56, retirementAge: 67, lifeExpectancy: 92 },
    },
    accounts: [
      { id: 'a1', name: PII_ACCOUNT_NAMES[0], type: 'taxable', owner: 'primary', currentBalance: 750_000, expectedReturnPct: 7, volatilityPct: 15, feePct: 0.1 },
      { id: 'a2', name: PII_ACCOUNT_NAMES[1], type: 'taxDeferred', owner: 'primary', currentBalance: 1_200_000, expectedReturnPct: 7, volatilityPct: 15, feePct: 0.05 },
      { id: 'a3', name: PII_ACCOUNT_NAMES[2], type: 'roth', owner: 'spouse', currentBalance: 300_000, expectedReturnPct: 7, volatilityPct: 15, feePct: 0.03 },
    ],
    otherIncome: [
      { id: 'i1', name: PII_INCOME_NAMES[0], owner: 'primary', startYear: 2035, annualAmount: 36_000, taxable: true },
      { id: 'i2', name: PII_INCOME_NAMES[1], owner: 'joint', startYear: 2026, endYear: 2045, annualAmount: 30_000, taxable: true },
    ],
    adjustments: [],
    spending: { targetAnnualSpend: 100_000, inflationPct: 2.5, survivorSpendingAdjustmentPct: 70 },
    taxes: { federalModel: 'effective', stateModel: 'effective', federalEffectiveRatePct: 24, stateEffectiveRatePct: 9.3, capGainsRatePct: 15 },
    market: { simulationMode: 'deterministic' },
    strategy: { withdrawalOrder: 'taxOptimized', rebalanceFrequency: 'annual', guardrailsEnabled: true },
  },
  planResultSummary: { successProbability: 0.78, medianTerminalValue: 400_000, worstCaseShortfall: 120_000 },
  userPreferences: { riskTolerance: 'moderate', spendingFloor: 80_000, legacyGoal: 200_000 },
};

const taxRequest: TaxStrategyAdviceRequest = {
  taxYear: 2025,
  taxYearRecord: {
    taxYear: 2025,
    status: 'draft',
    filingStatus: 'mfj',
    stateOfResidence: 'CA',
    income: { wages: 200_000, selfEmploymentIncome: 0, interestIncome: 8_000, dividendIncome: 12_000, qualifiedDividends: 9_000, capitalGains: 15_000, capitalLosses: 3_000, rentalIncome: 30_000, nqdcDistributions: 0, retirementDistributions: 0, socialSecurityIncome: 0, otherIncome: 0 },
    deductions: { standardDeduction: 30_000, useItemized: true, itemizedDeductions: { mortgageInterest: 18_000, stateAndLocalTaxes: 10_000, charitableContributions: 5_000, medicalExpenses: 0, other: 0 } },
    credits: { childTaxCredit: 4_000, educationCredits: 0, foreignTaxCredit: 500, otherCredits: 0 },
    payments: { federalWithheld: 40_000, stateWithheld: 15_000, estimatedPaymentsFederal: 8_000, estimatedPaymentsState: 3_000 },
    computedFederalTax: 45_000,
    computedStateTax: 18_000,
    computedEffectiveFederalRate: 17.1,
    computedEffectiveStateRate: 6.8,
    documentIds: ['d1', 'd2'],
  },
  priorYearRecord: null,
  sharedCorpus: {
    household: {
      maritalStatus: 'married',
      filingStatus: 'mfj',
      stateOfResidence: 'CA',
      primary: { id: 'primary', birthYear: 1968, currentAge: 57, retirementAge: 67, lifeExpectancy: 90 },
      spouse: { id: 'spouse', birthYear: 1970, currentAge: 55, retirementAge: 67, lifeExpectancy: 92 },
    },
    accounts: [
      { id: 'a1', name: PII_ACCOUNT_NAMES[0], type: 'taxable', owner: 'primary', currentBalance: 750_000, expectedReturnPct: 7, feePct: 0.1 },
      { id: 'a2', name: PII_ACCOUNT_NAMES[1], type: 'taxDeferred', owner: 'primary', currentBalance: 1_200_000, expectedReturnPct: 7, feePct: 0.05 },
    ],
    incomeStreams: [
      { id: 'i1', name: PII_INCOME_NAMES[0], owner: 'primary', startYear: 2035, annualAmount: 36_000, taxable: true },
    ],
  },
  userPreferences: { prioritize: 'minimize_tax' },
};

const taxDocuments: TaxDocument[] = [
  { id: 'd1', taxYear: 2025, formType: 'W-2', issuerName: PII_ISSUER_NAMES[0], sourceFileName: 'acme_w2_2025.pdf', oneDrivePath: '/FinPlanner/taxes/2025/acme_w2.pdf', extractedFields: { wages: 200_000, federalWithheld: 40_000 }, fieldConfidence: { wages: 0.98, federalWithheld: 0.97 }, extractionConfidence: 0.97, lowConfidenceFields: [], confirmedByUser: true, importedAt: '2026-01-15' },
  { id: 'd2', taxYear: 2025, formType: '1099-DIV', issuerName: PII_ISSUER_NAMES[1], sourceFileName: 'chase_1099div.pdf', oneDrivePath: '/FinPlanner/taxes/2025/chase_1099.pdf', extractedFields: { dividends: 12_000, qualifiedDividends: 9_000 }, fieldConfidence: { dividends: 0.95, qualifiedDividends: 0.93 }, extractionConfidence: 0.94, lowConfidenceFields: [], confirmedByUser: false, importedAt: '2026-01-20' },
];

// ── GT14: Portfolio PII Stripping ──

describe('GT14: PII Stripping — Portfolio', () => {
  const stripped = stripPortfolioPii(portfolioRequest);
  const json = JSON.stringify(stripped);

  it('output contains NO original account names', () => {
    for (const name of PII_ACCOUNT_NAMES) {
      expect(json).not.toContain(name);
    }
  });

  it('output contains type-based labels', () => {
    expect(stripped.accounts[0].label).toBe('Taxable Account 1');
    expect(stripped.accounts[1].label).toBe('Tax-Deferred Account 1');
    expect(stripped.accounts[2].label).toBe('Roth Account 1');
  });

  it('output contains NO original income stream names', () => {
    for (const name of PII_INCOME_NAMES) {
      expect(json).not.toContain(name);
    }
  });

  it('output preserves numeric fields (balances, rates, ages)', () => {
    expect(stripped.accounts[0].currentBalance).toBe(750_000);
    expect(stripped.accounts[1].currentBalance).toBe(1_200_000);
    expect(stripped.accounts[2].expectedReturnPct).toBe(7);
    expect(stripped.household.primary.currentAge).toBe(58);
    expect(stripped.simulationSummary.worstCaseShortfall).toBe(120_000);
  });

  it('output preserves stateOfResidence', () => {
    expect(stripped.household.stateOfResidence).toBe('CA');
  });
});

// ── GT14: Tax PII Stripping ──

describe('GT14: PII Stripping — Tax', () => {
  const stripped = stripTaxPii(taxRequest);
  const json = JSON.stringify(stripped);

  it('output contains NO original account names from sharedCorpus', () => {
    for (const name of PII_ACCOUNT_NAMES) {
      expect(json).not.toContain(name);
    }
  });

  it('output preserves all income/deduction/credit/payment numbers', () => {
    expect(stripped.income.wages).toBe(200_000);
    expect(stripped.income.dividendIncome).toBe(12_000);
    expect(stripped.computedFederalTax).toBe(45_000);
    expect(stripped.payments.federalWithheld).toBe(40_000);
    expect(stripped.credits.childTaxCredit).toBe(4_000);
  });
});

// ── GT14: Document PII Stripping ──

describe('GT14: PII Stripping — Documents', () => {
  const strippedDocs = stripDocumentsPii(taxDocuments);
  const json = JSON.stringify(strippedDocs);

  it('output contains NO original issuerNames', () => {
    for (const name of PII_ISSUER_NAMES) {
      expect(json).not.toContain(name);
    }
  });

  it('output contains NO sourceFileName or oneDrivePath', () => {
    expect(json).not.toContain('sourceFileName');
    expect(json).not.toContain('oneDrivePath');
    expect(json).not.toContain('acme_w2');
    expect(json).not.toContain('chase_1099div');
  });

  it('output contains anonymized issuer labels', () => {
    expect(strippedDocs[0].label).toBe('W-2 Issuer A');
    expect(strippedDocs[1].label).toBe('1099-DIV Issuer B');
  });

  it('preserves extractedFields', () => {
    expect(strippedDocs[0].extractedFields).toEqual({ wages: 200_000, federalWithheld: 40_000 });
    expect(strippedDocs[1].extractedFields).toEqual({ dividends: 12_000, qualifiedDividends: 9_000 });
  });
});

// ── GT14: End-to-End — Prompt from Stripped Context ──

describe('GT14: PII Stripping — End-to-End Prompt Verification', () => {
  it('portfolio prompt built from stripped context contains no PII', () => {
    const ctx = stripPortfolioPii(portfolioRequest);
    const { system, user } = buildPortfolioPrompt(ctx);
    const combined = system + user;

    for (const name of [...PII_ACCOUNT_NAMES, ...PII_INCOME_NAMES]) {
      expect(combined).not.toContain(name);
    }
    // Should contain anonymized labels
    expect(combined).toContain('Taxable Account 1');
    expect(combined).toContain('Income Stream 1');
  });

  it('tax prompt built from stripped context contains no PII', () => {
    const ctx = stripTaxPii(taxRequest);
    const { system, user } = buildTaxPrompt(ctx);
    const combined = system + user;

    for (const name of PII_ACCOUNT_NAMES) {
      expect(combined).not.toContain(name);
    }
    expect(combined).toContain('Taxable Account 1');
  });
});
