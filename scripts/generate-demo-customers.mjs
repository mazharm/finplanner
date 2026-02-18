#!/usr/bin/env node
/**
 * Generates three demo customer folders under demo-customers/.
 * Each folder follows the §7.4 layout with NDJSON files.
 *
 * Usage:  node scripts/generate-demo-customers.mjs
 */

import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', 'demo-customers');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const uuid = () => randomUUID();

function header(modules = ['tax', 'retirement']) {
  return JSON.stringify({
    _type: 'header',
    schemaVersion: '3.0.0',
    savedAt: '2026-01-15T00:00:00.000Z',
    modules,
  });
}

function line(type, data) {
  return JSON.stringify({ _type: type, ...data });
}

function writeNdjson(filePath, lines) {
  mkdirSync(join(filePath, '..'), { recursive: true });
  writeFileSync(filePath, lines.join('\n') + '\n', 'utf-8');
}

// ---------------------------------------------------------------------------
// Customer 1: Chen Family
// ---------------------------------------------------------------------------

function generateChenFamily() {
  const dir = join(ROOT, 'chen-family');

  // --- Stable IDs for cross-referencing ---
  const acctBrokerage = uuid();
  const acct401k = uuid();
  const acctIRA = uuid();
  const acctRoth = uuid();
  const acctDeferred = uuid();

  const incSS1 = uuid();
  const incSS2 = uuid();
  const incPension = uuid();
  const incRental = uuid();

  const docW2_2023 = uuid();
  const docDiv_2023 = uuid();
  const docW2_2024 = uuid();
  const doc1099R_2024 = uuid();
  const docInt_2025 = uuid();
  const doc1098_2025 = uuid();

  const now = '2026-01-15T00:00:00.000Z';

  // --- shared/corpus.ndjson ---
  writeNdjson(join(dir, 'shared', 'corpus.ndjson'), [
    header(),
    line('household', {
      maritalStatus: 'married',
      filingStatus: 'mfj',
      stateOfResidence: 'CA',
      primary: {
        id: 'primary',
        birthYear: 1960,
        currentAge: 66,
        retirementAge: 65,
        lifeExpectancy: 92,
        socialSecurity: {
          claimAge: 67,
          estimatedMonthlyBenefitAtClaim: 3200,
          colaPct: 2.5,
        },
      },
      spouse: {
        id: 'spouse',
        birthYear: 1962,
        currentAge: 64,
        retirementAge: 65,
        lifeExpectancy: 94,
        socialSecurity: {
          claimAge: 66,
          estimatedMonthlyBenefitAtClaim: 2100,
          colaPct: 2.5,
        },
      },
    }),
    line('account', {
      id: acctBrokerage,
      name: 'Vanguard Brokerage',
      type: 'taxable',
      owner: 'joint',
      currentBalance: 650000,
      costBasis: 420000,
      expectedReturnPct: 7.0,
      feePct: 0.05,
      targetAllocationPct: 24,
    }),
    line('account', {
      id: acct401k,
      name: 'Fidelity 401(k)',
      type: 'taxDeferred',
      owner: 'primary',
      currentBalance: 850000,
      expectedReturnPct: 7.0,
      feePct: 0.15,
      targetAllocationPct: 31,
    }),
    line('account', {
      id: acctIRA,
      name: 'Schwab IRA',
      type: 'taxDeferred',
      owner: 'spouse',
      currentBalance: 520000,
      expectedReturnPct: 7.0,
      feePct: 0.10,
      targetAllocationPct: 19,
    }),
    line('account', {
      id: acctRoth,
      name: 'Roth IRA',
      type: 'roth',
      owner: 'primary',
      currentBalance: 380000,
      expectedReturnPct: 7.0,
      feePct: 0.08,
      targetAllocationPct: 14,
    }),
    line('account', {
      id: acctDeferred,
      name: 'Pacific Corp Deferred Comp',
      type: 'deferredComp',
      owner: 'primary',
      currentBalance: 300000,
      expectedReturnPct: 5.0,
      feePct: 0.20,
      targetAllocationPct: 12,
      deferredCompSchedule: {
        startYear: 2026,
        endYear: 2035,
        frequency: 'annual',
        amount: 30000,
        inflationAdjusted: false,
      },
    }),
    line('incomeStream', {
      id: incSS1,
      name: "Robert's Social Security",
      owner: 'primary',
      startYear: 2027,
      annualAmount: 38400,
      colaPct: 2.5,
      taxable: true,
      survivorContinues: false,
    }),
    line('incomeStream', {
      id: incSS2,
      name: "Linda's Social Security",
      owner: 'spouse',
      startYear: 2028,
      annualAmount: 25200,
      colaPct: 2.5,
      taxable: true,
      survivorContinues: false,
    }),
    line('incomeStream', {
      id: incPension,
      name: 'State Pension',
      owner: 'primary',
      startYear: 2026,
      annualAmount: 24000,
      colaPct: 2.0,
      taxable: true,
      survivorContinues: true,
    }),
    line('incomeStream', {
      id: incRental,
      name: 'Rental Income',
      owner: 'joint',
      startYear: 2020,
      annualAmount: 18000,
      colaPct: 3.0,
      taxable: true,
      survivorContinues: true,
    }),
  ]);

  // --- tax/2023/ ---
  writeNdjson(join(dir, 'tax', '2023', 'record.ndjson'), [
    header(['tax']),
    line('taxYear', {
      taxYear: 2023,
      status: 'filed',
      filingStatus: 'mfj',
      stateOfResidence: 'CA',
      income: {
        wages: 185000,
        selfEmploymentIncome: 0,
        interestIncome: 2100,
        dividendIncome: 8200,
        qualifiedDividends: 6800,
        capitalGains: 4500,
        capitalLosses: 0,
        rentalIncome: 15000,
        nqdcDistributions: 0,
        retirementDistributions: 0,
        socialSecurityIncome: 0,
        otherIncome: 0,
      },
      deductions: {
        standardDeduction: 27700,
        itemizedDeductions: {
          mortgageInterest: 14200,
          stateAndLocalTaxes: 10000,
          charitableContributions: 5500,
          medicalExpenses: 0,
          other: 0,
        },
        useItemized: true,
      },
      credits: {
        childTaxCredit: 0,
        educationCredits: 0,
        foreignTaxCredit: 320,
        otherCredits: 0,
      },
      payments: {
        federalWithheld: 32500,
        stateWithheld: 14200,
        estimatedPaymentsFederal: 0,
        estimatedPaymentsState: 0,
      },
      computedFederalTax: 30800,
      computedStateTax: 12600,
      computedEffectiveFederalRate: 14.3,
      computedEffectiveStateRate: 5.9,
      refundOrBalanceDueFederal: 1700,
      refundOrBalanceDueState: 1600,
      documentIds: [docW2_2023, docDiv_2023],
    }),
    line('taxDocument', {
      id: docW2_2023,
      taxYear: 2023,
      formType: 'W-2',
      issuerName: 'Acme Technology Corp',
      sourceFileName: 'W2-2023-Acme.pdf',
      extractedFields: { wages: 185000, federalWithheld: 32500, stateWithheld: 14200 },
      fieldConfidence: { wages: 0.97, federalWithheld: 0.95, stateWithheld: 0.93 },
      extractionConfidence: 0.95,
      lowConfidenceFields: [],
      confirmedByUser: true,
      importedAt: now,
    }),
    line('taxDocument', {
      id: docDiv_2023,
      taxYear: 2023,
      formType: '1099-DIV',
      issuerName: 'Vanguard Group',
      sourceFileName: '1099-DIV-2023-Vanguard.pdf',
      extractedFields: { ordinaryDividends: 8200, qualifiedDividends: 6800 },
      fieldConfidence: { ordinaryDividends: 0.96, qualifiedDividends: 0.94 },
      extractionConfidence: 0.95,
      lowConfidenceFields: [],
      confirmedByUser: true,
      importedAt: now,
    }),
  ]);

  writeNdjson(join(dir, 'tax', '2023', 'checklist.ndjson'), [
    header(['tax']),
    line('checklistItem', {
      id: uuid(),
      taxYear: 2023,
      category: 'document',
      description: 'Collect W-2 from Acme Technology Corp',
      status: 'received',
      sourceReasoning: 'Prior year wages reported',
      linkedDocumentId: docW2_2023,
    }),
    line('checklistItem', {
      id: uuid(),
      taxYear: 2023,
      category: 'document',
      description: 'Collect 1099-DIV from Vanguard Group',
      status: 'received',
      sourceReasoning: 'Taxable brokerage account generates dividends',
      linkedDocumentId: docDiv_2023,
    }),
    line('checklistItem', {
      id: uuid(),
      taxYear: 2023,
      category: 'income',
      description: 'Report rental income from investment property',
      status: 'received',
      sourceReasoning: 'Rental income stream exists',
    }),
    line('checklistItem', {
      id: uuid(),
      taxYear: 2023,
      category: 'deduction',
      description: 'Gather mortgage interest statement (1098)',
      status: 'received',
      sourceReasoning: 'Itemized deductions include mortgage interest',
    }),
  ]);

  // --- tax/2024/ ---
  writeNdjson(join(dir, 'tax', '2024', 'record.ndjson'), [
    header(['tax']),
    line('taxYear', {
      taxYear: 2024,
      status: 'filed',
      filingStatus: 'mfj',
      stateOfResidence: 'CA',
      income: {
        wages: 120000,
        selfEmploymentIncome: 0,
        interestIncome: 2800,
        dividendIncome: 9100,
        qualifiedDividends: 7500,
        capitalGains: 6200,
        capitalLosses: 1200,
        rentalIncome: 16500,
        nqdcDistributions: 0,
        retirementDistributions: 35000,
        socialSecurityIncome: 0,
        otherIncome: 0,
      },
      deductions: {
        standardDeduction: 30000,
        itemizedDeductions: {
          mortgageInterest: 13800,
          stateAndLocalTaxes: 10000,
          charitableContributions: 6000,
          medicalExpenses: 0,
          other: 0,
        },
        useItemized: true,
      },
      credits: {
        childTaxCredit: 0,
        educationCredits: 0,
        foreignTaxCredit: 280,
        otherCredits: 0,
      },
      payments: {
        federalWithheld: 28000,
        stateWithheld: 11500,
        estimatedPaymentsFederal: 2000,
        estimatedPaymentsState: 1000,
      },
      computedFederalTax: 26400,
      computedStateTax: 10800,
      computedEffectiveFederalRate: 14.0,
      computedEffectiveStateRate: 5.7,
      refundOrBalanceDueFederal: 3600,
      refundOrBalanceDueState: 1700,
      documentIds: [docW2_2024, doc1099R_2024],
    }),
    line('taxDocument', {
      id: docW2_2024,
      taxYear: 2024,
      formType: 'W-2',
      issuerName: 'Acme Technology Corp',
      sourceFileName: 'W2-2024-Acme.pdf',
      extractedFields: { wages: 120000, federalWithheld: 21000, stateWithheld: 9200 },
      fieldConfidence: { wages: 0.96, federalWithheld: 0.93, stateWithheld: 0.91 },
      extractionConfidence: 0.93,
      lowConfidenceFields: ['stateWithheld'],
      confirmedByUser: true,
      importedAt: now,
    }),
    line('taxDocument', {
      id: doc1099R_2024,
      taxYear: 2024,
      formType: '1099-R',
      issuerName: 'Fidelity Investments',
      sourceFileName: '1099-R-2024-Fidelity.pdf',
      extractedFields: { grossDistribution: 35000, taxableAmount: 35000, federalWithheld: 7000 },
      fieldConfidence: { grossDistribution: 0.98, taxableAmount: 0.97, federalWithheld: 0.96 },
      extractionConfidence: 0.97,
      lowConfidenceFields: [],
      confirmedByUser: true,
      importedAt: now,
    }),
  ]);

  writeNdjson(join(dir, 'tax', '2024', 'checklist.ndjson'), [
    header(['tax']),
    line('checklistItem', {
      id: uuid(),
      taxYear: 2024,
      category: 'document',
      description: 'Collect W-2 from Acme Technology Corp (partial year)',
      status: 'received',
      sourceReasoning: 'Wages reported in 2024 tax year',
      linkedDocumentId: docW2_2024,
    }),
    line('checklistItem', {
      id: uuid(),
      taxYear: 2024,
      category: 'document',
      description: 'Collect 1099-R from Fidelity Investments',
      status: 'received',
      sourceReasoning: 'Retirement distributions began in 2024',
      linkedDocumentId: doc1099R_2024,
    }),
    line('checklistItem', {
      id: uuid(),
      taxYear: 2024,
      category: 'life_event',
      description: 'Document retirement date for Robert',
      status: 'received',
      sourceReasoning: 'Mid-year retirement affects income and withholding',
    }),
    line('checklistItem', {
      id: uuid(),
      taxYear: 2024,
      category: 'deadline',
      description: 'File extension if needed by April 15',
      status: 'not_applicable',
      sourceReasoning: 'Standard filing deadline',
    }),
  ]);

  writeNdjson(join(dir, 'tax', '2024', 'anomalies.ndjson'), [
    header(['tax']),
    line('anomaly', {
      id: uuid(),
      taxYear: 2024,
      comparisonYear: 2023,
      category: 'anomaly',
      severity: 'warning',
      field: 'wages',
      description: 'Wages dropped 35% ($185K to $120K)',
      priorValue: 185000,
      currentValue: 120000,
      percentChange: -35.1,
      suggestedAction: "Verify partial-year W-2 matches Robert's retirement date",
    }),
    line('anomaly', {
      id: uuid(),
      taxYear: 2024,
      comparisonYear: 2023,
      category: 'pattern_break',
      severity: 'info',
      field: 'retirementDistributions',
      description: 'New retirement distributions ($35K) — not present in prior year',
      priorValue: 0,
      currentValue: 35000,
      suggestedAction: 'Confirm 1099-R received from Fidelity for 401(k) distributions',
    }),
  ]);

  // --- tax/2025/ ---
  writeNdjson(join(dir, 'tax', '2025', 'record.ndjson'), [
    header(['tax']),
    line('taxYear', {
      taxYear: 2025,
      status: 'draft',
      filingStatus: 'mfj',
      stateOfResidence: 'CA',
      income: {
        wages: 0,
        selfEmploymentIncome: 0,
        interestIncome: 3800,
        dividendIncome: 9600,
        qualifiedDividends: 7900,
        capitalGains: 8400,
        capitalLosses: 2100,
        rentalIncome: 18000,
        nqdcDistributions: 30000,
        retirementDistributions: 45000,
        socialSecurityIncome: 32000,
        otherIncome: 0,
      },
      deductions: {
        standardDeduction: 32300,
        useItemized: false,
      },
      credits: {
        childTaxCredit: 0,
        educationCredits: 0,
        foreignTaxCredit: 150,
        otherCredits: 0,
      },
      payments: {
        federalWithheld: 0,
        stateWithheld: 0,
        estimatedPaymentsFederal: 8000,
        estimatedPaymentsState: 3500,
      },
      computedFederalTax: 14200,
      computedStateTax: 6800,
      computedEffectiveFederalRate: 9.7,
      computedEffectiveStateRate: 4.6,
      documentIds: [docInt_2025, doc1098_2025],
    }),
    line('taxDocument', {
      id: docInt_2025,
      taxYear: 2025,
      formType: '1099-INT',
      issuerName: 'Pacific Credit Union',
      sourceFileName: '1099-INT-2025-Pacific.pdf',
      extractedFields: { interestIncome: 3800 },
      fieldConfidence: { interestIncome: 0.88 },
      extractionConfidence: 0.88,
      lowConfidenceFields: ['interestIncome'],
      confirmedByUser: false,
      importedAt: now,
    }),
    line('taxDocument', {
      id: doc1098_2025,
      taxYear: 2025,
      formType: '1098',
      issuerName: 'First National Mortgage',
      sourceFileName: '1098-2025-FirstNational.pdf',
      extractedFields: { mortgageInterest: 12400, propertyTax: 8200 },
      fieldConfidence: { mortgageInterest: 0.92, propertyTax: 0.89 },
      extractionConfidence: 0.90,
      lowConfidenceFields: ['propertyTax'],
      confirmedByUser: false,
      importedAt: now,
    }),
  ]);

  writeNdjson(join(dir, 'tax', '2025', 'checklist.ndjson'), [
    header(['tax']),
    line('checklistItem', {
      id: uuid(),
      taxYear: 2025,
      category: 'document',
      description: 'Collect 1099-INT from Pacific Credit Union',
      status: 'received',
      sourceReasoning: 'Interest income expected',
      linkedDocumentId: docInt_2025,
    }),
    line('checklistItem', {
      id: uuid(),
      taxYear: 2025,
      category: 'document',
      description: 'Collect 1098 from First National Mortgage',
      status: 'received',
      sourceReasoning: 'Mortgage interest deduction',
      linkedDocumentId: doc1098_2025,
    }),
    line('checklistItem', {
      id: uuid(),
      taxYear: 2025,
      category: 'document',
      description: 'Collect 1099-R for retirement distributions',
      status: 'pending',
      sourceReasoning: 'Continued retirement distributions in full retirement year',
    }),
    line('checklistItem', {
      id: uuid(),
      taxYear: 2025,
      category: 'income',
      description: 'Report Social Security income (SSA-1099)',
      status: 'pending',
      sourceReasoning: 'SS benefits began in 2025',
    }),
  ]);

  writeNdjson(join(dir, 'tax', '2025', 'anomalies.ndjson'), [
    header(['tax']),
    line('anomaly', {
      id: uuid(),
      taxYear: 2025,
      comparisonYear: 2024,
      category: 'anomaly',
      severity: 'critical',
      field: 'wages',
      description: 'Wages dropped to $0 (from $120K)',
      priorValue: 120000,
      currentValue: 0,
      percentChange: -100,
      suggestedAction: 'Confirm both spouses fully retired; no W-2 expected for 2025',
    }),
    line('anomaly', {
      id: uuid(),
      taxYear: 2025,
      comparisonYear: 2024,
      category: 'pattern_break',
      severity: 'info',
      field: 'socialSecurityIncome',
      description: 'New Social Security income ($32K) — first year of benefits',
      priorValue: 0,
      currentValue: 32000,
      suggestedAction: 'Collect SSA-1099; up to 85% may be taxable at this income level',
    }),
  ]);

  // --- retirement/plan.ndjson ---
  writeNdjson(join(dir, 'retirement', 'plan.ndjson'), [
    header(['retirement']),
    line('retirementPlan', {
      spending: {
        targetAnnualSpend: 110000,
        inflationPct: 2.5,
        floorAnnualSpend: 85000,
        ceilingAnnualSpend: 140000,
        survivorSpendingAdjustmentPct: 70,
      },
      taxes: {
        federalModel: 'effective',
        stateModel: 'effective',
        federalEffectiveRatePct: 18,
        stateEffectiveRatePct: 8,
        capGainsRatePct: 15,
      },
      market: {
        simulationMode: 'deterministic',
        deterministicReturnPct: 7.0,
        deterministicInflationPct: 2.5,
      },
      strategy: {
        withdrawalOrder: 'taxOptimized',
        rebalanceFrequency: 'annual',
        guardrailsEnabled: true,
      },
    }),
  ]);

  console.log('  ✓ chen-family/');
}

// ---------------------------------------------------------------------------
// Customer 2: Johnson Household
// ---------------------------------------------------------------------------

function generateJohnsonHousehold() {
  const dir = join(ROOT, 'johnson-household');

  const acct401k = uuid();
  const acctRoth = uuid();
  const acctBrokerage = uuid();

  const incRental = uuid();

  const docW2_2024 = uuid();
  const doc1099B_2024 = uuid();
  const docW2_2025 = uuid();
  const doc1099INT_2025 = uuid();

  const now = '2026-01-15T00:00:00.000Z';

  // --- shared/corpus.ndjson ---
  writeNdjson(join(dir, 'shared', 'corpus.ndjson'), [
    header(),
    line('household', {
      maritalStatus: 'single',
      filingStatus: 'single',
      stateOfResidence: 'NY',
      primary: {
        id: 'primary',
        birthYear: 1991,
        currentAge: 35,
        retirementAge: 60,
        lifeExpectancy: 90,
        socialSecurity: {
          claimAge: 67,
          estimatedMonthlyBenefitAtClaim: 3800,
          colaPct: 2.5,
        },
      },
    }),
    line('account', {
      id: acct401k,
      name: 'Megacorp 401(k)',
      type: 'taxDeferred',
      owner: 'primary',
      currentBalance: 185000,
      expectedReturnPct: 7.5,
      feePct: 0.12,
      targetAllocationPct: 50,
    }),
    line('account', {
      id: acctRoth,
      name: 'Vanguard Roth IRA',
      type: 'roth',
      owner: 'primary',
      currentBalance: 62000,
      expectedReturnPct: 7.5,
      feePct: 0.04,
      targetAllocationPct: 20,
    }),
    line('account', {
      id: acctBrokerage,
      name: 'Schwab Taxable Brokerage',
      type: 'taxable',
      owner: 'primary',
      currentBalance: 95000,
      costBasis: 78000,
      expectedReturnPct: 7.0,
      feePct: 0.03,
      targetAllocationPct: 30,
    }),
    line('incomeStream', {
      id: incRental,
      name: 'Rental Income (Brooklyn studio)',
      owner: 'primary',
      startYear: 2024,
      annualAmount: 24000,
      colaPct: 3.0,
      taxable: true,
      survivorContinues: false,
    }),
  ]);

  // --- tax/2024/ ---
  writeNdjson(join(dir, 'tax', '2024', 'record.ndjson'), [
    header(['tax']),
    line('taxYear', {
      taxYear: 2024,
      status: 'filed',
      filingStatus: 'single',
      stateOfResidence: 'NY',
      income: {
        wages: 195000,
        selfEmploymentIncome: 0,
        interestIncome: 1200,
        dividendIncome: 3400,
        qualifiedDividends: 2800,
        capitalGains: 12500,
        capitalLosses: 3000,
        rentalIncome: 22000,
        nqdcDistributions: 0,
        retirementDistributions: 0,
        socialSecurityIncome: 0,
        otherIncome: 0,
      },
      deductions: {
        standardDeduction: 14600,
        useItemized: false,
      },
      credits: {
        childTaxCredit: 0,
        educationCredits: 0,
        foreignTaxCredit: 0,
        otherCredits: 0,
      },
      payments: {
        federalWithheld: 42000,
        stateWithheld: 12800,
        estimatedPaymentsFederal: 0,
        estimatedPaymentsState: 0,
      },
      computedFederalTax: 40200,
      computedStateTax: 12100,
      computedEffectiveFederalRate: 17.5,
      computedEffectiveStateRate: 5.3,
      refundOrBalanceDueFederal: 1800,
      refundOrBalanceDueState: 700,
      documentIds: [docW2_2024, doc1099B_2024],
    }),
    line('taxDocument', {
      id: docW2_2024,
      taxYear: 2024,
      formType: 'W-2',
      issuerName: 'Megacorp Technologies Inc',
      sourceFileName: 'W2-2024-Megacorp.pdf',
      extractedFields: { wages: 195000, federalWithheld: 42000, stateWithheld: 12800 },
      fieldConfidence: { wages: 0.98, federalWithheld: 0.97, stateWithheld: 0.96 },
      extractionConfidence: 0.97,
      lowConfidenceFields: [],
      confirmedByUser: true,
      importedAt: now,
    }),
    line('taxDocument', {
      id: doc1099B_2024,
      taxYear: 2024,
      formType: '1099-B',
      issuerName: 'Charles Schwab',
      sourceFileName: '1099-B-2024-Schwab.pdf',
      extractedFields: { proceeds: 45000, costBasis: 35500, gainOrLoss: 9500 },
      fieldConfidence: { proceeds: 0.95, costBasis: 0.93, gainOrLoss: 0.94 },
      extractionConfidence: 0.94,
      lowConfidenceFields: [],
      confirmedByUser: true,
      importedAt: now,
    }),
  ]);

  writeNdjson(join(dir, 'tax', '2024', 'checklist.ndjson'), [
    header(['tax']),
    line('checklistItem', {
      id: uuid(),
      taxYear: 2024,
      category: 'document',
      description: 'Collect W-2 from Megacorp Technologies',
      status: 'received',
      sourceReasoning: 'Primary employer wages',
      linkedDocumentId: docW2_2024,
    }),
    line('checklistItem', {
      id: uuid(),
      taxYear: 2024,
      category: 'document',
      description: 'Collect 1099-B from Charles Schwab',
      status: 'received',
      sourceReasoning: 'Stock sales in taxable brokerage',
      linkedDocumentId: doc1099B_2024,
    }),
    line('checklistItem', {
      id: uuid(),
      taxYear: 2024,
      category: 'income',
      description: 'Report rental income from Brooklyn studio',
      status: 'received',
      sourceReasoning: 'Rental property owned since 2024',
    }),
  ]);

  // --- tax/2025/ ---
  writeNdjson(join(dir, 'tax', '2025', 'record.ndjson'), [
    header(['tax']),
    line('taxYear', {
      taxYear: 2025,
      status: 'draft',
      filingStatus: 'single',
      stateOfResidence: 'NY',
      income: {
        wages: 210000,
        selfEmploymentIncome: 0,
        interestIncome: 1800,
        dividendIncome: 4100,
        qualifiedDividends: 3300,
        capitalGains: 5200,
        capitalLosses: 800,
        rentalIncome: 24000,
        nqdcDistributions: 0,
        retirementDistributions: 0,
        socialSecurityIncome: 0,
        otherIncome: 0,
      },
      deductions: {
        standardDeduction: 15000,
        useItemized: false,
      },
      credits: {
        childTaxCredit: 0,
        educationCredits: 0,
        foreignTaxCredit: 0,
        otherCredits: 0,
      },
      payments: {
        federalWithheld: 46000,
        stateWithheld: 14200,
        estimatedPaymentsFederal: 0,
        estimatedPaymentsState: 0,
      },
      computedFederalTax: 44800,
      computedStateTax: 13500,
      computedEffectiveFederalRate: 18.3,
      computedEffectiveStateRate: 5.5,
      documentIds: [docW2_2025, doc1099INT_2025],
    }),
    line('taxDocument', {
      id: docW2_2025,
      taxYear: 2025,
      formType: 'W-2',
      issuerName: 'Megacorp Technologies Inc',
      sourceFileName: 'W2-2025-Megacorp.pdf',
      extractedFields: { wages: 210000, federalWithheld: 46000, stateWithheld: 14200 },
      fieldConfidence: { wages: 0.96, federalWithheld: 0.94, stateWithheld: 0.92 },
      extractionConfidence: 0.94,
      lowConfidenceFields: [],
      confirmedByUser: false,
      importedAt: now,
    }),
    line('taxDocument', {
      id: doc1099INT_2025,
      taxYear: 2025,
      formType: '1099-INT',
      issuerName: 'Ally Bank',
      sourceFileName: '1099-INT-2025-Ally.pdf',
      extractedFields: { interestIncome: 1800 },
      fieldConfidence: { interestIncome: 0.91 },
      extractionConfidence: 0.91,
      lowConfidenceFields: [],
      confirmedByUser: false,
      importedAt: now,
    }),
  ]);

  writeNdjson(join(dir, 'tax', '2025', 'checklist.ndjson'), [
    header(['tax']),
    line('checklistItem', {
      id: uuid(),
      taxYear: 2025,
      category: 'document',
      description: 'Collect W-2 from Megacorp Technologies',
      status: 'received',
      sourceReasoning: 'Primary employer wages',
      linkedDocumentId: docW2_2025,
    }),
    line('checklistItem', {
      id: uuid(),
      taxYear: 2025,
      category: 'document',
      description: 'Collect 1099-INT from Ally Bank',
      status: 'received',
      sourceReasoning: 'High-yield savings interest',
      linkedDocumentId: doc1099INT_2025,
    }),
    line('checklistItem', {
      id: uuid(),
      taxYear: 2025,
      category: 'deduction',
      description: 'Max out 401(k) contributions ($23,000)',
      status: 'pending',
      sourceReasoning: 'Reduces taxable income at high marginal rate',
    }),
  ]);

  writeNdjson(join(dir, 'tax', '2025', 'anomalies.ndjson'), [
    header(['tax']),
    line('anomaly', {
      id: uuid(),
      taxYear: 2025,
      comparisonYear: 2024,
      category: 'anomaly',
      severity: 'info',
      field: 'wages',
      description: 'Wages increased 7.7% ($195K to $210K)',
      priorValue: 195000,
      currentValue: 210000,
      percentChange: 7.7,
      suggestedAction: 'Verify promotion/raise reflected correctly on W-2',
    }),
  ]);

  // --- retirement/plan.ndjson ---
  writeNdjson(join(dir, 'retirement', 'plan.ndjson'), [
    header(['retirement']),
    line('retirementPlan', {
      spending: {
        targetAnnualSpend: 80000,
        inflationPct: 2.5,
        floorAnnualSpend: 60000,
        ceilingAnnualSpend: 110000,
        survivorSpendingAdjustmentPct: 70,
      },
      taxes: {
        federalModel: 'effective',
        stateModel: 'effective',
        federalEffectiveRatePct: 22,
        stateEffectiveRatePct: 6,
        capGainsRatePct: 15,
      },
      market: {
        simulationMode: 'deterministic',
        deterministicReturnPct: 7.5,
        deterministicInflationPct: 2.5,
      },
      strategy: {
        withdrawalOrder: 'taxOptimized',
        rebalanceFrequency: 'annual',
        guardrailsEnabled: true,
      },
    }),
  ]);

  console.log('  ✓ johnson-household/');
}

// ---------------------------------------------------------------------------
// Customer 3: Garcia Family
// ---------------------------------------------------------------------------

function generateGarciaFamily() {
  const dir = join(ROOT, 'garcia-family');

  const acctMiguel401k = uuid();
  const acctElena401k = uuid();
  const acctRoth = uuid();
  const acctTaxable = uuid();

  const incRental = uuid();
  const incDeferred = uuid();

  const docW2Miguel_2023 = uuid();
  const docW2Elena_2023 = uuid();
  const docW2Miguel_2024 = uuid();
  const docW2Elena_2024 = uuid();
  const docW2Miguel_2025 = uuid();
  const docW2Elena_2025 = uuid();

  const now = '2026-01-15T00:00:00.000Z';

  // --- shared/corpus.ndjson ---
  writeNdjson(join(dir, 'shared', 'corpus.ndjson'), [
    header(),
    line('household', {
      maritalStatus: 'married',
      filingStatus: 'mfj',
      stateOfResidence: 'TX',
      primary: {
        id: 'primary',
        birthYear: 1978,
        currentAge: 48,
        retirementAge: 62,
        lifeExpectancy: 88,
        socialSecurity: {
          claimAge: 67,
          estimatedMonthlyBenefitAtClaim: 3500,
          colaPct: 2.5,
        },
      },
      spouse: {
        id: 'spouse',
        birthYear: 1981,
        currentAge: 45,
        retirementAge: 62,
        lifeExpectancy: 90,
        socialSecurity: {
          claimAge: 67,
          estimatedMonthlyBenefitAtClaim: 2600,
          colaPct: 2.5,
        },
      },
    }),
    line('account', {
      id: acctMiguel401k,
      name: "Miguel's 401(k) — Lone Star Energy",
      type: 'taxDeferred',
      owner: 'primary',
      currentBalance: 420000,
      expectedReturnPct: 7.0,
      feePct: 0.18,
      targetAllocationPct: 35,
    }),
    line('account', {
      id: acctElena401k,
      name: "Elena's 403(b) — Austin ISD",
      type: 'taxDeferred',
      owner: 'spouse',
      currentBalance: 195000,
      expectedReturnPct: 6.5,
      feePct: 0.25,
      targetAllocationPct: 20,
    }),
    line('account', {
      id: acctRoth,
      name: 'Fidelity Roth IRA',
      type: 'roth',
      owner: 'primary',
      currentBalance: 88000,
      expectedReturnPct: 7.5,
      feePct: 0.04,
      targetAllocationPct: 15,
    }),
    line('account', {
      id: acctTaxable,
      name: 'Vanguard Taxable',
      type: 'taxable',
      owner: 'joint',
      currentBalance: 145000,
      costBasis: 112000,
      expectedReturnPct: 7.0,
      feePct: 0.05,
      targetAllocationPct: 30,
    }),
    line('incomeStream', {
      id: incRental,
      name: 'Rental Income (Austin duplex)',
      owner: 'joint',
      startYear: 2021,
      annualAmount: 28000,
      colaPct: 3.0,
      taxable: true,
      survivorContinues: true,
    }),
    line('incomeStream', {
      id: incDeferred,
      name: "Elena's Deferred Comp",
      owner: 'spouse',
      startYear: 2043,
      endYear: 2052,
      annualAmount: 15000,
      colaPct: 0,
      taxable: true,
      survivorContinues: false,
    }),
  ]);

  // --- tax/2023/ ---
  writeNdjson(join(dir, 'tax', '2023', 'record.ndjson'), [
    header(['tax']),
    line('taxYear', {
      taxYear: 2023,
      status: 'filed',
      filingStatus: 'mfj',
      stateOfResidence: 'TX',
      income: {
        wages: 245000,
        selfEmploymentIncome: 0,
        interestIncome: 900,
        dividendIncome: 4200,
        qualifiedDividends: 3500,
        capitalGains: 2800,
        capitalLosses: 0,
        rentalIncome: 25000,
        nqdcDistributions: 0,
        retirementDistributions: 0,
        socialSecurityIncome: 0,
        otherIncome: 0,
      },
      deductions: {
        standardDeduction: 27700,
        useItemized: false,
      },
      credits: {
        childTaxCredit: 4000,
        educationCredits: 0,
        foreignTaxCredit: 0,
        otherCredits: 0,
      },
      payments: {
        federalWithheld: 48500,
        stateWithheld: 0,
        estimatedPaymentsFederal: 0,
        estimatedPaymentsState: 0,
      },
      computedFederalTax: 44200,
      computedStateTax: 0,
      computedEffectiveFederalRate: 15.9,
      computedEffectiveStateRate: 0,
      refundOrBalanceDueFederal: 4300,
      refundOrBalanceDueState: 0,
      documentIds: [docW2Miguel_2023, docW2Elena_2023],
    }),
    line('taxDocument', {
      id: docW2Miguel_2023,
      taxYear: 2023,
      formType: 'W-2',
      issuerName: 'Lone Star Energy Corp',
      sourceFileName: 'W2-2023-LoneStar.pdf',
      extractedFields: { wages: 155000, federalWithheld: 31000 },
      fieldConfidence: { wages: 0.97, federalWithheld: 0.96 },
      extractionConfidence: 0.96,
      lowConfidenceFields: [],
      confirmedByUser: true,
      importedAt: now,
    }),
    line('taxDocument', {
      id: docW2Elena_2023,
      taxYear: 2023,
      formType: 'W-2',
      issuerName: 'Austin Independent School District',
      sourceFileName: 'W2-2023-AustinISD.pdf',
      extractedFields: { wages: 90000, federalWithheld: 17500 },
      fieldConfidence: { wages: 0.98, federalWithheld: 0.97 },
      extractionConfidence: 0.97,
      lowConfidenceFields: [],
      confirmedByUser: true,
      importedAt: now,
    }),
  ]);

  writeNdjson(join(dir, 'tax', '2023', 'checklist.ndjson'), [
    header(['tax']),
    line('checklistItem', {
      id: uuid(),
      taxYear: 2023,
      category: 'document',
      description: 'Collect W-2 from Lone Star Energy Corp',
      status: 'received',
      sourceReasoning: "Miguel's primary employer",
      linkedDocumentId: docW2Miguel_2023,
    }),
    line('checklistItem', {
      id: uuid(),
      taxYear: 2023,
      category: 'document',
      description: 'Collect W-2 from Austin ISD',
      status: 'received',
      sourceReasoning: "Elena's primary employer",
      linkedDocumentId: docW2Elena_2023,
    }),
    line('checklistItem', {
      id: uuid(),
      taxYear: 2023,
      category: 'income',
      description: 'Report rental income from Austin duplex',
      status: 'received',
      sourceReasoning: 'Joint rental property owned since 2021',
    }),
  ]);

  // --- tax/2024/ ---
  writeNdjson(join(dir, 'tax', '2024', 'record.ndjson'), [
    header(['tax']),
    line('taxYear', {
      taxYear: 2024,
      status: 'filed',
      filingStatus: 'mfj',
      stateOfResidence: 'TX',
      income: {
        wages: 260000,
        selfEmploymentIncome: 0,
        interestIncome: 1100,
        dividendIncome: 5000,
        qualifiedDividends: 4200,
        capitalGains: 3500,
        capitalLosses: 500,
        rentalIncome: 27000,
        nqdcDistributions: 0,
        retirementDistributions: 0,
        socialSecurityIncome: 0,
        otherIncome: 0,
      },
      deductions: {
        standardDeduction: 30000,
        useItemized: false,
      },
      credits: {
        childTaxCredit: 4000,
        educationCredits: 0,
        foreignTaxCredit: 0,
        otherCredits: 0,
      },
      payments: {
        federalWithheld: 52000,
        stateWithheld: 0,
        estimatedPaymentsFederal: 0,
        estimatedPaymentsState: 0,
      },
      computedFederalTax: 48600,
      computedStateTax: 0,
      computedEffectiveFederalRate: 16.4,
      computedEffectiveStateRate: 0,
      refundOrBalanceDueFederal: 3400,
      refundOrBalanceDueState: 0,
      documentIds: [docW2Miguel_2024, docW2Elena_2024],
    }),
    line('taxDocument', {
      id: docW2Miguel_2024,
      taxYear: 2024,
      formType: 'W-2',
      issuerName: 'Lone Star Energy Corp',
      sourceFileName: 'W2-2024-LoneStar.pdf',
      extractedFields: { wages: 165000, federalWithheld: 33500 },
      fieldConfidence: { wages: 0.97, federalWithheld: 0.95 },
      extractionConfidence: 0.96,
      lowConfidenceFields: [],
      confirmedByUser: true,
      importedAt: now,
    }),
    line('taxDocument', {
      id: docW2Elena_2024,
      taxYear: 2024,
      formType: 'W-2',
      issuerName: 'Austin Independent School District',
      sourceFileName: 'W2-2024-AustinISD.pdf',
      extractedFields: { wages: 95000, federalWithheld: 18500 },
      fieldConfidence: { wages: 0.98, federalWithheld: 0.97 },
      extractionConfidence: 0.97,
      lowConfidenceFields: [],
      confirmedByUser: true,
      importedAt: now,
    }),
  ]);

  writeNdjson(join(dir, 'tax', '2024', 'checklist.ndjson'), [
    header(['tax']),
    line('checklistItem', {
      id: uuid(),
      taxYear: 2024,
      category: 'document',
      description: 'Collect W-2 from Lone Star Energy Corp',
      status: 'received',
      sourceReasoning: "Miguel's primary employer",
      linkedDocumentId: docW2Miguel_2024,
    }),
    line('checklistItem', {
      id: uuid(),
      taxYear: 2024,
      category: 'document',
      description: 'Collect W-2 from Austin ISD',
      status: 'received',
      sourceReasoning: "Elena's primary employer",
      linkedDocumentId: docW2Elena_2024,
    }),
    line('checklistItem', {
      id: uuid(),
      taxYear: 2024,
      category: 'deduction',
      description: 'Verify 401(k) and 403(b) contribution limits',
      status: 'received',
      sourceReasoning: 'Both spouses have employer retirement plans',
    }),
  ]);

  writeNdjson(join(dir, 'tax', '2024', 'anomalies.ndjson'), [
    header(['tax']),
    line('anomaly', {
      id: uuid(),
      taxYear: 2024,
      comparisonYear: 2023,
      category: 'anomaly',
      severity: 'info',
      field: 'wages',
      description: 'Combined wages increased 6.1% ($245K to $260K)',
      priorValue: 245000,
      currentValue: 260000,
      percentChange: 6.1,
      suggestedAction: 'Verify raises reflected correctly on both W-2s',
    }),
  ]);

  // --- tax/2025/ ---
  writeNdjson(join(dir, 'tax', '2025', 'record.ndjson'), [
    header(['tax']),
    line('taxYear', {
      taxYear: 2025,
      status: 'draft',
      filingStatus: 'mfj',
      stateOfResidence: 'TX',
      income: {
        wages: 275000,
        selfEmploymentIncome: 0,
        interestIncome: 1400,
        dividendIncome: 5800,
        qualifiedDividends: 4800,
        capitalGains: 4200,
        capitalLosses: 1000,
        rentalIncome: 29000,
        nqdcDistributions: 0,
        retirementDistributions: 0,
        socialSecurityIncome: 0,
        otherIncome: 0,
      },
      deductions: {
        standardDeduction: 32300,
        useItemized: false,
      },
      credits: {
        childTaxCredit: 4000,
        educationCredits: 0,
        foreignTaxCredit: 0,
        otherCredits: 0,
      },
      payments: {
        federalWithheld: 55000,
        stateWithheld: 0,
        estimatedPaymentsFederal: 0,
        estimatedPaymentsState: 0,
      },
      computedFederalTax: 51800,
      computedStateTax: 0,
      computedEffectiveFederalRate: 16.4,
      computedEffectiveStateRate: 0,
      documentIds: [docW2Miguel_2025, docW2Elena_2025],
    }),
    line('taxDocument', {
      id: docW2Miguel_2025,
      taxYear: 2025,
      formType: 'W-2',
      issuerName: 'Lone Star Energy Corp',
      sourceFileName: 'W2-2025-LoneStar.pdf',
      extractedFields: { wages: 175000, federalWithheld: 36000 },
      fieldConfidence: { wages: 0.95, federalWithheld: 0.93 },
      extractionConfidence: 0.94,
      lowConfidenceFields: [],
      confirmedByUser: false,
      importedAt: now,
    }),
    line('taxDocument', {
      id: docW2Elena_2025,
      taxYear: 2025,
      formType: 'W-2',
      issuerName: 'Austin Independent School District',
      sourceFileName: 'W2-2025-AustinISD.pdf',
      extractedFields: { wages: 100000, federalWithheld: 19000 },
      fieldConfidence: { wages: 0.96, federalWithheld: 0.95 },
      extractionConfidence: 0.95,
      lowConfidenceFields: [],
      confirmedByUser: false,
      importedAt: now,
    }),
  ]);

  writeNdjson(join(dir, 'tax', '2025', 'checklist.ndjson'), [
    header(['tax']),
    line('checklistItem', {
      id: uuid(),
      taxYear: 2025,
      category: 'document',
      description: 'Collect W-2 from Lone Star Energy Corp',
      status: 'received',
      sourceReasoning: "Miguel's primary employer",
      linkedDocumentId: docW2Miguel_2025,
    }),
    line('checklistItem', {
      id: uuid(),
      taxYear: 2025,
      category: 'document',
      description: 'Collect W-2 from Austin ISD',
      status: 'received',
      sourceReasoning: "Elena's primary employer",
      linkedDocumentId: docW2Elena_2025,
    }),
  ]);

  writeNdjson(join(dir, 'tax', '2025', 'anomalies.ndjson'), [
    header(['tax']),
    line('anomaly', {
      id: uuid(),
      taxYear: 2025,
      comparisonYear: 2024,
      category: 'anomaly',
      severity: 'info',
      field: 'wages',
      description: 'Combined wages increased 5.8% ($260K to $275K)',
      priorValue: 260000,
      currentValue: 275000,
      percentChange: 5.8,
      suggestedAction: 'Confirm raises match expectations; both still employed',
    }),
  ]);

  // --- retirement/plan.ndjson ---
  writeNdjson(join(dir, 'retirement', 'plan.ndjson'), [
    header(['retirement']),
    line('retirementPlan', {
      spending: {
        targetAnnualSpend: 95000,
        inflationPct: 2.5,
        floorAnnualSpend: 75000,
        ceilingAnnualSpend: 130000,
        survivorSpendingAdjustmentPct: 70,
      },
      taxes: {
        federalModel: 'effective',
        stateModel: 'none',
        federalEffectiveRatePct: 18,
        capGainsRatePct: 15,
      },
      market: {
        simulationMode: 'deterministic',
        deterministicReturnPct: 7.0,
        deterministicInflationPct: 2.5,
      },
      strategy: {
        withdrawalOrder: 'taxOptimized',
        rebalanceFrequency: 'annual',
        guardrailsEnabled: true,
      },
    }),
  ]);

  console.log('  ✓ garcia-family/');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

console.log('Generating demo customers...');
rmSync(ROOT, { recursive: true, force: true });
mkdirSync(ROOT, { recursive: true });

generateChenFamily();
generateJohnsonHousehold();
generateGarciaFamily();

console.log(`\nDone! Generated 3 customer folders in demo-customers/`);
