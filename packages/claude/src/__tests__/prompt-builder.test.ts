import { describe, it, expect } from 'vitest';
import { buildPortfolioPrompt, buildTaxPrompt } from '../prompt-builder.js';
import type { AnonymizedPortfolioContext, AnonymizedTaxContext } from '../types.js';

function makePortfolioCtx(): AnonymizedPortfolioContext {
  return {
    household: {
      filingStatus: 'mfj',
      stateOfResidence: 'WA',
      primary: { currentAge: 56, retirementAge: 65, lifeExpectancy: 90 },
      spouse: { currentAge: 54, retirementAge: 65, lifeExpectancy: 92 },
    },
    accounts: [
      { label: 'Taxable Account 1', type: 'taxable', owner: 'primary', currentBalance: 500_000, expectedReturnPct: 7, feePct: 0.1 },
      { label: 'Tax-Deferred Account 1', type: 'taxDeferred', owner: 'primary', currentBalance: 800_000, expectedReturnPct: 7, feePct: 0.05 },
    ],
    incomeStreams: [
      { label: 'Income Stream 1', owner: 'primary', startYear: 2035, annualAmount: 30_000, taxable: true },
    ],
    taxes: { federalModel: 'effective', stateModel: 'none', federalEffectiveRatePct: 22, capGainsRatePct: 15 },
    simulationSummary: { successProbability: 0.85, medianTerminalValue: 500_000, worstCaseShortfall: 50_000 },
    userPreferences: { riskTolerance: 'moderate', spendingFloor: 60_000, legacyGoal: 100_000 },
  };
}

function makeTaxCtx(): AnonymizedTaxContext {
  return {
    taxYear: 2025,
    filingStatus: 'mfj',
    stateOfResidence: 'WA',
    income: { wages: 150_000, selfEmploymentIncome: 0, interestIncome: 5_000, dividendIncome: 8_000, qualifiedDividends: 6_000, capitalGains: 10_000, capitalLosses: 2_000, rentalIncome: 24_000, nqdcDistributions: 0, retirementDistributions: 0, socialSecurityIncome: 0, otherIncome: 0 },
    deductions: { standardDeduction: 30_000, useItemized: false },
    credits: { childTaxCredit: 0, educationCredits: 0, foreignTaxCredit: 0, otherCredits: 0 },
    payments: { federalWithheld: 25_000, stateWithheld: 0, estimatedPaymentsFederal: 5_000, estimatedPaymentsState: 0 },
    computedFederalTax: 35_000,
    computedStateTax: 0,
    documents: [{ label: 'W-2 Issuer A', formType: 'W-2', extractedFields: { wages: 150_000 } }],
    accounts: [{ label: 'Taxable Account 1', type: 'taxable', currentBalance: 500_000 }],
    userPreferences: { prioritize: 'minimize_tax' },
  };
}

describe('buildPortfolioPrompt', () => {
  it('includes household, accounts, income, taxes, summary sections in user prompt', () => {
    const { user } = buildPortfolioPrompt(makePortfolioCtx());
    expect(user).toContain('Household:');
    expect(user).toContain('Accounts:');
    expect(user).toContain('Income Streams:');
    expect(user).toContain('Tax Configuration:');
    expect(user).toContain('Simulation Summary:');
    expect(user).toContain('User Preferences:');
  });

  it('does NOT contain raw account names (only anonymized labels)', () => {
    const { system, user } = buildPortfolioPrompt(makePortfolioCtx());
    const combined = system + user;
    expect(combined).toContain('Taxable Account 1');
    expect(combined).toContain('Tax-Deferred Account 1');
    // Should never have real names
    expect(combined).not.toContain('Fidelity');
    expect(combined).not.toContain('Vanguard');
  });

  it('includes JSON schema instruction in system prompt', () => {
    const { system } = buildPortfolioPrompt(makePortfolioCtx());
    expect(system).toContain('JSON');
    expect(system).toContain('recommendations');
    expect(system).toContain('withdrawalStrategyAdvice');
  });

  it('includes disclaimer requirement in system prompt', () => {
    const { system } = buildPortfolioPrompt(makePortfolioCtx());
    expect(system).toContain('disclaimer');
  });

  it('includes spouse data when present', () => {
    const { user } = buildPortfolioPrompt(makePortfolioCtx());
    expect(user).toContain('Spouse');
    expect(user).toContain('54');
  });
});

describe('buildTaxPrompt', () => {
  it('includes income, deductions, credits, payments sections', () => {
    const { user } = buildTaxPrompt(makeTaxCtx());
    expect(user).toContain('Income:');
    expect(user).toContain('Deductions:');
    expect(user).toContain('Credits:');
    expect(user).toContain('Payments:');
  });

  it('includes prior year data when available', () => {
    const ctx = makeTaxCtx();
    ctx.priorYear = {
      taxYear: 2024,
      income: { wages: 140_000, selfEmploymentIncome: 0, interestIncome: 4_000, dividendIncome: 7_000, qualifiedDividends: 5_000, capitalGains: 8_000, capitalLosses: 1_000, rentalIncome: 22_000, nqdcDistributions: 0, retirementDistributions: 0, socialSecurityIncome: 0, otherIncome: 0 },
      deductions: { standardDeduction: 29_000, useItemized: false },
      credits: { childTaxCredit: 0, educationCredits: 0, foreignTaxCredit: 0, otherCredits: 0 },
      payments: { federalWithheld: 24_000, stateWithheld: 0, estimatedPaymentsFederal: 4_000, estimatedPaymentsState: 0 },
      computedFederalTax: 32_000,
      computedStateTax: 0,
    };
    const { user } = buildTaxPrompt(ctx);
    expect(user).toContain('Prior Year (2024)');
    expect(user).toContain('32,000');
  });

  it('includes JSON schema instruction in system prompt', () => {
    const { system } = buildTaxPrompt(makeTaxCtx());
    expect(system).toContain('JSON');
    expect(system).toContain('recommendations');
    expect(system).toContain('taxOptimizationOpportunities');
  });
});
