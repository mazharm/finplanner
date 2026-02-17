import type {
  HouseholdProfile,
  Account,
  IncomeStream,
  TaxYearRecord,
  TaxDocument,
  ChecklistItem,
  Anomaly,
  PlanInput,
  PlanResult,
  SpendingPlan,
  TaxConfig,
  MarketConfig,
  StrategyConfig,
} from '@finplanner/domain';
import { SCHEMA_VERSION } from '@finplanner/domain';
import { simulate } from '@finplanner/engine';
import { setAppState } from '../services/indexeddb.js';
import { useSharedStore } from '../stores/shared-store.js';
import { useTaxStore } from '../stores/tax-store.js';
import { useRetirementStore } from '../stores/retirement-store.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const uuid = () => crypto.randomUUID();

// ---------------------------------------------------------------------------
// Household
// ---------------------------------------------------------------------------

function createDemoHousehold(): HouseholdProfile {
  return {
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
  };
}

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

function createDemoAccounts(): Account[] {
  return [
    {
      id: uuid(),
      name: 'Vanguard Brokerage',
      type: 'taxable',
      owner: 'joint',
      currentBalance: 650_000,
      costBasis: 420_000,
      expectedReturnPct: 7.0,
      feePct: 0.05,
      targetAllocationPct: 24,
    },
    {
      id: uuid(),
      name: 'Fidelity 401(k)',
      type: 'taxDeferred',
      owner: 'primary',
      currentBalance: 850_000,
      expectedReturnPct: 7.0,
      feePct: 0.15,
      targetAllocationPct: 31,
    },
    {
      id: uuid(),
      name: 'Schwab IRA',
      type: 'taxDeferred',
      owner: 'spouse',
      currentBalance: 520_000,
      expectedReturnPct: 7.0,
      feePct: 0.10,
      targetAllocationPct: 19,
    },
    {
      id: uuid(),
      name: 'Roth IRA',
      type: 'roth',
      owner: 'primary',
      currentBalance: 380_000,
      expectedReturnPct: 7.0,
      feePct: 0.08,
      targetAllocationPct: 14,
    },
    {
      id: uuid(),
      name: 'Pacific Corp Deferred Comp',
      type: 'deferredComp',
      owner: 'primary',
      currentBalance: 300_000,
      expectedReturnPct: 5.0,
      feePct: 0.20,
      targetAllocationPct: 12,
      deferredCompSchedule: {
        startYear: 2026,
        endYear: 2035,
        frequency: 'annual',
        amount: 30_000,
        inflationAdjusted: false,
      },
    },
  ];
}

// ---------------------------------------------------------------------------
// Income Streams
// ---------------------------------------------------------------------------

function createDemoIncomeStreams(): IncomeStream[] {
  return [
    {
      id: uuid(),
      name: "Robert's Social Security",
      owner: 'primary',
      startYear: 2027,
      annualAmount: 38_400,
      colaPct: 2.5,
      taxable: true,
      survivorContinues: false,
    },
    {
      id: uuid(),
      name: "Linda's Social Security",
      owner: 'spouse',
      startYear: 2028,
      annualAmount: 25_200,
      colaPct: 2.5,
      taxable: true,
      survivorContinues: false,
    },
    {
      id: uuid(),
      name: 'State Pension',
      owner: 'primary',
      startYear: 2026,
      annualAmount: 24_000,
      colaPct: 2.0,
      taxable: true,
      survivorContinues: true,
    },
    {
      id: uuid(),
      name: 'Rental Income',
      owner: 'joint',
      startYear: 2020,
      annualAmount: 18_000,
      colaPct: 3.0,
      taxable: true,
      survivorContinues: true,
    },
  ];
}

// ---------------------------------------------------------------------------
// Tax Documents
// ---------------------------------------------------------------------------

interface DocsByYear {
  [year: number]: string[];
}

function createDemoDocuments(): { documents: TaxDocument[]; idsByYear: DocsByYear } {
  const idsByYear: DocsByYear = { 2023: [], 2024: [], 2025: [] };
  const now = new Date().toISOString();
  const documents: TaxDocument[] = [];

  // 2023 docs
  const w2_2023 = uuid();
  idsByYear[2023].push(w2_2023);
  documents.push({
    id: w2_2023,
    taxYear: 2023,
    formType: 'W-2',
    issuerName: 'Acme Technology Corp',
    sourceFileName: 'W2-2023-Acme.pdf',
    extractedFields: { wages: 185_000, federalWithheld: 32_500, stateWithheld: 14_200 },
    fieldConfidence: { wages: 0.97, federalWithheld: 0.95, stateWithheld: 0.93 },
    extractionConfidence: 0.95,
    lowConfidenceFields: [],
    confirmedByUser: true,
    importedAt: now,
  });

  const div_2023 = uuid();
  idsByYear[2023].push(div_2023);
  documents.push({
    id: div_2023,
    taxYear: 2023,
    formType: '1099-DIV',
    issuerName: 'Vanguard Group',
    sourceFileName: '1099-DIV-2023-Vanguard.pdf',
    extractedFields: { ordinaryDividends: 8_200, qualifiedDividends: 6_800 },
    fieldConfidence: { ordinaryDividends: 0.96, qualifiedDividends: 0.94 },
    extractionConfidence: 0.95,
    lowConfidenceFields: [],
    confirmedByUser: true,
    importedAt: now,
  });

  // 2024 docs
  const w2_2024 = uuid();
  idsByYear[2024].push(w2_2024);
  documents.push({
    id: w2_2024,
    taxYear: 2024,
    formType: 'W-2',
    issuerName: 'Acme Technology Corp',
    sourceFileName: 'W2-2024-Acme.pdf',
    extractedFields: { wages: 120_000, federalWithheld: 21_000, stateWithheld: 9_200 },
    fieldConfidence: { wages: 0.96, federalWithheld: 0.93, stateWithheld: 0.91 },
    extractionConfidence: 0.93,
    lowConfidenceFields: ['stateWithheld'],
    confirmedByUser: true,
    importedAt: now,
  });

  const r_2024 = uuid();
  idsByYear[2024].push(r_2024);
  documents.push({
    id: r_2024,
    taxYear: 2024,
    formType: '1099-R',
    issuerName: 'Fidelity Investments',
    sourceFileName: '1099-R-2024-Fidelity.pdf',
    extractedFields: { grossDistribution: 35_000, taxableAmount: 35_000, federalWithheld: 7_000 },
    fieldConfidence: { grossDistribution: 0.98, taxableAmount: 0.97, federalWithheld: 0.96 },
    extractionConfidence: 0.97,
    lowConfidenceFields: [],
    confirmedByUser: true,
    importedAt: now,
  });

  // 2025 docs
  const int_2025 = uuid();
  idsByYear[2025].push(int_2025);
  documents.push({
    id: int_2025,
    taxYear: 2025,
    formType: '1099-INT',
    issuerName: 'Pacific Credit Union',
    sourceFileName: '1099-INT-2025-Pacific.pdf',
    extractedFields: { interestIncome: 3_800 },
    fieldConfidence: { interestIncome: 0.88 },
    extractionConfidence: 0.88,
    lowConfidenceFields: ['interestIncome'],
    confirmedByUser: false,
    importedAt: now,
  });

  const mort_2025 = uuid();
  idsByYear[2025].push(mort_2025);
  documents.push({
    id: mort_2025,
    taxYear: 2025,
    formType: '1098',
    issuerName: 'First National Mortgage',
    sourceFileName: '1098-2025-FirstNational.pdf',
    extractedFields: { mortgageInterest: 12_400, propertyTax: 8_200 },
    fieldConfidence: { mortgageInterest: 0.92, propertyTax: 0.89 },
    extractionConfidence: 0.90,
    lowConfidenceFields: ['propertyTax'],
    confirmedByUser: false,
    importedAt: now,
  });

  return { documents, idsByYear };
}

// ---------------------------------------------------------------------------
// Tax Years
// ---------------------------------------------------------------------------

function createDemoTaxYears(idsByYear: DocsByYear): TaxYearRecord[] {
  return [
    // 2023 — filed, both working full year
    {
      taxYear: 2023,
      status: 'filed',
      filingStatus: 'mfj',
      stateOfResidence: 'CA',
      income: {
        wages: 185_000,
        selfEmploymentIncome: 0,
        interestIncome: 2_100,
        dividendIncome: 8_200,
        qualifiedDividends: 6_800,
        capitalGains: 4_500,
        capitalLosses: 0,
        rentalIncome: 15_000,
        nqdcDistributions: 0,
        retirementDistributions: 0,
        socialSecurityIncome: 0,
        otherIncome: 0,
      },
      deductions: {
        standardDeduction: 27_700,
        itemizedDeductions: {
          mortgageInterest: 14_200,
          stateAndLocalTaxes: 10_000,
          charitableContributions: 5_500,
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
        federalWithheld: 32_500,
        stateWithheld: 14_200,
        estimatedPaymentsFederal: 0,
        estimatedPaymentsState: 0,
      },
      computedFederalTax: 30_800,
      computedStateTax: 12_600,
      computedEffectiveFederalRate: 14.3,
      computedEffectiveStateRate: 5.9,
      refundOrBalanceDueFederal: 1_700,
      refundOrBalanceDueState: 1_600,
      documentIds: idsByYear[2023],
    },
    // 2024 — filed, Robert retires mid-year
    {
      taxYear: 2024,
      status: 'filed',
      filingStatus: 'mfj',
      stateOfResidence: 'CA',
      income: {
        wages: 120_000,
        selfEmploymentIncome: 0,
        interestIncome: 2_800,
        dividendIncome: 9_100,
        qualifiedDividends: 7_500,
        capitalGains: 6_200,
        capitalLosses: 1_200,
        rentalIncome: 16_500,
        nqdcDistributions: 0,
        retirementDistributions: 35_000,
        socialSecurityIncome: 0,
        otherIncome: 0,
      },
      deductions: {
        standardDeduction: 30_000,
        itemizedDeductions: {
          mortgageInterest: 13_800,
          stateAndLocalTaxes: 10_000,
          charitableContributions: 6_000,
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
        federalWithheld: 28_000,
        stateWithheld: 11_500,
        estimatedPaymentsFederal: 2_000,
        estimatedPaymentsState: 1_000,
      },
      computedFederalTax: 26_400,
      computedStateTax: 10_800,
      computedEffectiveFederalRate: 14.0,
      computedEffectiveStateRate: 5.7,
      refundOrBalanceDueFederal: 3_600,
      refundOrBalanceDueState: 1_700,
      documentIds: idsByYear[2024],
    },
    // 2025 — draft, full retirement year, SS starts
    {
      taxYear: 2025,
      status: 'draft',
      filingStatus: 'mfj',
      stateOfResidence: 'CA',
      income: {
        wages: 0,
        selfEmploymentIncome: 0,
        interestIncome: 3_800,
        dividendIncome: 9_600,
        qualifiedDividends: 7_900,
        capitalGains: 8_400,
        capitalLosses: 2_100,
        rentalIncome: 18_000,
        nqdcDistributions: 30_000,
        retirementDistributions: 45_000,
        socialSecurityIncome: 32_000,
        otherIncome: 0,
      },
      deductions: {
        standardDeduction: 32_300,
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
        estimatedPaymentsFederal: 8_000,
        estimatedPaymentsState: 3_500,
      },
      computedFederalTax: 14_200,
      computedStateTax: 6_800,
      computedEffectiveFederalRate: 9.7,
      computedEffectiveStateRate: 4.6,
      documentIds: idsByYear[2025],
    },
  ];
}

// ---------------------------------------------------------------------------
// Checklist Items
// ---------------------------------------------------------------------------

function createDemoChecklist(idsByYear: DocsByYear): ChecklistItem[] {
  const items: ChecklistItem[] = [];

  // 2023 checklist
  items.push(
    { id: uuid(), taxYear: 2023, category: 'document', description: 'Collect W-2 from Acme Technology Corp', status: 'received', sourceReasoning: 'Prior year wages reported', linkedDocumentId: idsByYear[2023][0] },
    { id: uuid(), taxYear: 2023, category: 'document', description: 'Collect 1099-DIV from Vanguard Group', status: 'received', sourceReasoning: 'Taxable brokerage account generates dividends', linkedDocumentId: idsByYear[2023][1] },
    { id: uuid(), taxYear: 2023, category: 'income', description: 'Report rental income from investment property', status: 'received', sourceReasoning: 'Rental income stream exists' },
    { id: uuid(), taxYear: 2023, category: 'deduction', description: 'Gather mortgage interest statement (1098)', status: 'received', sourceReasoning: 'Itemized deductions include mortgage interest' },
  );

  // 2024 checklist
  items.push(
    { id: uuid(), taxYear: 2024, category: 'document', description: 'Collect W-2 from Acme Technology Corp (partial year)', status: 'received', sourceReasoning: 'Wages reported in 2024 tax year', linkedDocumentId: idsByYear[2024][0] },
    { id: uuid(), taxYear: 2024, category: 'document', description: 'Collect 1099-R from Fidelity Investments', status: 'received', sourceReasoning: 'Retirement distributions began in 2024', linkedDocumentId: idsByYear[2024][1] },
    { id: uuid(), taxYear: 2024, category: 'life_event', description: 'Document retirement date for Robert', status: 'received', sourceReasoning: 'Mid-year retirement affects income and withholding' },
    { id: uuid(), taxYear: 2024, category: 'deadline', description: 'File extension if needed by April 15', status: 'not_applicable', sourceReasoning: 'Standard filing deadline' },
  );

  // 2025 checklist
  items.push(
    { id: uuid(), taxYear: 2025, category: 'document', description: 'Collect 1099-INT from Pacific Credit Union', status: 'received', sourceReasoning: 'Interest income expected', linkedDocumentId: idsByYear[2025][0] },
    { id: uuid(), taxYear: 2025, category: 'document', description: 'Collect 1098 from First National Mortgage', status: 'received', sourceReasoning: 'Mortgage interest deduction', linkedDocumentId: idsByYear[2025][1] },
    { id: uuid(), taxYear: 2025, category: 'document', description: 'Collect 1099-R for retirement distributions', status: 'pending', sourceReasoning: 'Continued retirement distributions in full retirement year' },
    { id: uuid(), taxYear: 2025, category: 'income', description: 'Report Social Security income (SSA-1099)', status: 'pending', sourceReasoning: 'SS benefits began in 2025' },
    { id: uuid(), taxYear: 2025, category: 'deduction', description: 'Evaluate standard vs. itemized deduction', status: 'waived', sourceReasoning: 'Standard deduction likely higher due to age-based increase' },
    { id: uuid(), taxYear: 2025, category: 'deadline', description: 'Quarterly estimated payment Q1 (April 15)', status: 'received', sourceReasoning: 'No withholding — estimated payments required' },
    { id: uuid(), taxYear: 2025, category: 'deadline', description: 'Quarterly estimated payment Q2 (June 15)', status: 'pending', sourceReasoning: 'Ongoing estimated payment obligation' },
  );

  return items;
}

// ---------------------------------------------------------------------------
// Anomalies
// ---------------------------------------------------------------------------

function createDemoAnomalies(): Anomaly[] {
  return [
    {
      id: uuid(),
      taxYear: 2024,
      comparisonYear: 2023,
      category: 'anomaly',
      severity: 'warning',
      field: 'wages',
      description: 'Wages dropped 35% ($185K to $120K)',
      priorValue: 185_000,
      currentValue: 120_000,
      percentChange: -35.1,
      suggestedAction: 'Verify partial-year W-2 matches Robert\'s retirement date',
    },
    {
      id: uuid(),
      taxYear: 2024,
      comparisonYear: 2023,
      category: 'pattern_break',
      severity: 'info',
      field: 'retirementDistributions',
      description: 'New retirement distributions ($35K) — not present in prior year',
      priorValue: 0,
      currentValue: 35_000,
      suggestedAction: 'Confirm 1099-R received from Fidelity for 401(k) distributions',
    },
    {
      id: uuid(),
      taxYear: 2025,
      comparisonYear: 2024,
      category: 'anomaly',
      severity: 'critical',
      field: 'wages',
      description: 'Wages dropped to $0 (from $120K)',
      priorValue: 120_000,
      currentValue: 0,
      percentChange: -100,
      suggestedAction: 'Confirm both spouses fully retired; no W-2 expected for 2025',
    },
    {
      id: uuid(),
      taxYear: 2025,
      comparisonYear: 2024,
      category: 'pattern_break',
      severity: 'info',
      field: 'socialSecurityIncome',
      description: 'New Social Security income ($32K) — first year of benefits',
      priorValue: 0,
      currentValue: 32_000,
      suggestedAction: 'Collect SSA-1099; up to 85% may be taxable at this income level',
    },
  ];
}

// ---------------------------------------------------------------------------
// Retirement Plan Config
// ---------------------------------------------------------------------------

function createDemoSpending(): SpendingPlan {
  return {
    targetAnnualSpend: 110_000,
    inflationPct: 2.5,
    floorAnnualSpend: 85_000,
    ceilingAnnualSpend: 140_000,
    survivorSpendingAdjustmentPct: 70,
  };
}

function createDemoTaxConfig(): TaxConfig {
  return {
    federalModel: 'effective',
    stateModel: 'effective',
    federalEffectiveRatePct: 18,
    stateEffectiveRatePct: 8,
    capGainsRatePct: 15,
  };
}

function createDemoMarket(): MarketConfig {
  return {
    simulationMode: 'deterministic',
    deterministicReturnPct: 7.0,
    deterministicInflationPct: 2.5,
  };
}

function createDemoStrategy(): StrategyConfig {
  return {
    withdrawalOrder: 'taxOptimized',
    rebalanceFrequency: 'annual',
    guardrailsEnabled: true,
  };
}

// ---------------------------------------------------------------------------
// Scenarios + Simulation
// ---------------------------------------------------------------------------

interface Scenario {
  id: string;
  name: string;
  spending: SpendingPlan;
  taxes: TaxConfig;
  market: MarketConfig;
  strategy: StrategyConfig;
  result?: PlanResult;
  runAt?: string;
}

function buildPlanInput(
  household: HouseholdProfile,
  accounts: Account[],
  incomeStreams: IncomeStream[],
  spending: SpendingPlan,
  taxes: TaxConfig,
  market: MarketConfig,
  strategy: StrategyConfig,
): PlanInput {
  // Filter out SS income — those are on PersonProfile.socialSecurity, not otherIncome
  const otherIncome = incomeStreams.filter(
    (s) => !s.name.toLowerCase().includes('social security'),
  );

  return {
    schemaVersion: SCHEMA_VERSION,
    household,
    accounts,
    otherIncome,
    adjustments: [],
    spending,
    taxes,
    market,
    strategy,
  };
}

function createDemoScenarios(
  household: HouseholdProfile,
  accounts: Account[],
  incomeStreams: IncomeStream[],
  spending: SpendingPlan,
  taxes: TaxConfig,
  market: MarketConfig,
  strategy: StrategyConfig,
): Scenario[] {
  const now = new Date().toISOString();

  // Scenario 1: Baseline
  const baselinePlan = buildPlanInput(household, accounts, incomeStreams, spending, taxes, market, strategy);
  const baselineResult = simulate(baselinePlan);

  // Scenario 2: Conservative Spending
  const conservativeSpending: SpendingPlan = {
    ...spending,
    targetAnnualSpend: 90_000,
    floorAnnualSpend: 70_000,
    ceilingAnnualSpend: 120_000,
  };
  const conservativePlan = buildPlanInput(household, accounts, incomeStreams, conservativeSpending, taxes, market, strategy);
  const conservativeResult = simulate(conservativePlan);

  // Scenario 3: Early Downturn
  const downturnMarket: MarketConfig = {
    ...market,
    deterministicReturnPct: 4.0,
  };
  const downturnPlan = buildPlanInput(household, accounts, incomeStreams, spending, taxes, downturnMarket, strategy);
  const downturnResult = simulate(downturnPlan);

  return [
    {
      id: uuid(),
      name: 'Baseline Plan',
      spending,
      taxes,
      market,
      strategy,
      result: baselineResult,
      runAt: now,
    },
    {
      id: uuid(),
      name: 'Conservative Spending',
      spending: conservativeSpending,
      taxes,
      market,
      strategy,
      result: conservativeResult,
      runAt: now,
    },
    {
      id: uuid(),
      name: 'Early Downturn',
      spending,
      taxes,
      market: downturnMarket,
      strategy,
      result: downturnResult,
      runAt: now,
    },
  ];
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

export async function loadDemoData(): Promise<void> {
  // 1. Generate all data
  const household = createDemoHousehold();
  const accounts = createDemoAccounts();
  const incomeStreams = createDemoIncomeStreams();
  const { documents, idsByYear } = createDemoDocuments();
  const taxYears = createDemoTaxYears(idsByYear);
  const checklistItems = createDemoChecklist(idsByYear);
  const anomalies = createDemoAnomalies();

  const spending = createDemoSpending();
  const taxes = createDemoTaxConfig();
  const market = createDemoMarket();
  const strategy = createDemoStrategy();

  // 2. Run simulations for scenarios
  const scenarios = createDemoScenarios(
    household, accounts, incomeStreams,
    spending, taxes, market, strategy,
  );

  const baselineScenario = scenarios[0];
  const latestResult = baselineScenario.result ?? null;

  // 3. Persist to IndexedDB
  await setAppState('shared', {
    household,
    accounts,
    incomeStreams,
    adjustments: [],
  });

  await setAppState('tax', {
    taxYears,
    documents,
    checklistItems,
    anomalies,
  });

  await setAppState('retirement', {
    spending,
    taxes,
    market,
    strategy,
    scenarios,
    activeScenarioId: baselineScenario.id,
  });

  // 4. Update in-memory Zustand stores (no page reload needed)
  useSharedStore.setState({
    household,
    accounts,
    incomeStreams,
    adjustments: [],
    initialized: true,
    persistError: null,
  });

  useTaxStore.setState({
    taxYears,
    documents,
    checklistItems,
    anomalies,
    initialized: true,
    persistError: null,
  });

  useRetirementStore.setState({
    spending,
    taxes,
    market,
    strategy,
    scenarios,
    activeScenarioId: baselineScenario.id,
    latestResult,
    initialized: true,
    persistError: null,
  });
}
