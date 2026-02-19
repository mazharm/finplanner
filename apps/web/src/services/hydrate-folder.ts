/**
 * Reads a FinPlanner data folder (§7.4 layout) and hydrates all stores.
 *
 * Folder structure:
 *   shared/corpus.ndjson       → household, account, incomeStream, adjustment
 *   tax/{year}/record.ndjson   → taxYear, taxDocument
 *   tax/{year}/checklist.ndjson→ checklistItem
 *   tax/{year}/anomalies.ndjson→ anomaly
 *   retirement/plan.ndjson     → retirementPlan (spending, taxes, market, strategy)
 *   retirement/results/{id}.ndjson → simulationResult
 */

import type { FolderReader } from './folder-reader.js';
import type {
  HouseholdProfile,
  Account,
  IncomeStream,
  Adjustment,
  TaxYearRecord,
  TaxDocument,
  ChecklistItem,
  Anomaly,
  SpendingPlan,
  TaxConfig,
  MarketConfig,
  StrategyConfig,
  PlanResult,
} from '@finplanner/domain';
import type { NdjsonRecordType } from '@finplanner/domain';
import { getSchemaForType } from '@finplanner/storage';
import { setAppState } from './indexeddb.js';
import { useSharedStore } from '../stores/shared-store.js';
import { useTaxStore } from '../stores/tax-store.js';
import { useRetirementStore } from '../stores/retirement-store.js';

export interface HydrationResult {
  recordCounts: Record<string, number>;
  errors: string[];
  warnings: string[];
}

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

function parseNdjsonLines(
  content: string,
  sourcePath: string,
  warnings: string[],
): Array<{ type: string; data: Record<string, unknown> }> {
  const records: Array<{ type: string; data: Record<string, unknown> }> = [];
  let lineNumber = 0;
  for (const line of content.split('\n')) {
    lineNumber++;
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>;
      const type = (parsed._type as string) ?? 'unknown';
      records.push({ type, data: parsed });
    } catch {
      warnings.push(`Skipped malformed JSON line ${lineNumber} in ${sourcePath}`);
    }
  }
  return records;
}

function validateRecord(type: string, data: Record<string, unknown>): { valid: boolean; parsed: unknown } {
  const schema = getSchemaForType(type as NdjsonRecordType);
  if (!schema) return { valid: false, parsed: null };
  const rest = Object.fromEntries(Object.entries(data).filter(([k]) => k !== '_type'));
  const result = schema.safeParse(rest);
  return { valid: result.success, parsed: result.success ? result.data : null };
}

export async function hydrateFromFolder(reader: FolderReader): Promise<HydrationResult> {
  const counts: Record<string, number> = {};
  const errors: string[] = [];
  const warnings: string[] = [];

  const inc = (type: string) => { counts[type] = (counts[type] ?? 0) + 1; };

  // --- Shared corpus ---
  let household: HouseholdProfile | null = null;
  const accounts: Account[] = [];
  const incomeStreams: IncomeStream[] = [];
  const adjustments: Adjustment[] = [];

  const corpusContent = await reader.readFile('shared/corpus.ndjson');
  if (corpusContent) {
    for (const { type, data } of parseNdjsonLines(corpusContent, 'shared/corpus.ndjson', warnings)) {
      if (type === 'header') continue;
      const { valid, parsed } = validateRecord(type, data);
      if (!valid) {
        if (type !== 'unknown') warnings.push(`Skipped invalid ${type} record in corpus.ndjson`);
        continue;
      }
      switch (type) {
        case 'household': household = parsed as HouseholdProfile; inc('household'); break;
        case 'account': accounts.push(parsed as Account); inc('account'); break;
        case 'incomeStream': incomeStreams.push(parsed as IncomeStream); inc('incomeStream'); break;
        case 'adjustment': adjustments.push(parsed as Adjustment); inc('adjustment'); break;
      }
    }
  } else {
    warnings.push('shared/corpus.ndjson not found');
  }

  // --- Tax years ---
  const taxYears: TaxYearRecord[] = [];
  const documents: TaxDocument[] = [];
  const checklistItems: ChecklistItem[] = [];
  const anomalies: Anomaly[] = [];

  const taxIsDir = await reader.isDirectory('tax');
  if (taxIsDir) {
    const yearFolders = await reader.listEntries('tax');
    for (const yearName of yearFolders) {
      // Only process numeric year folders
      if (!/^\d{4}$/.test(yearName)) continue;
      const yearPath = `tax/${yearName}`;
      if (!(await reader.isDirectory(yearPath))) continue;

      // record.ndjson → taxYear + taxDocument
      const recordContent = await reader.readFile(`${yearPath}/record.ndjson`);
      if (recordContent) {
        for (const { type, data } of parseNdjsonLines(recordContent, `tax/${yearName}/record.ndjson`, warnings)) {
          if (type === 'header') continue;
          const { valid, parsed } = validateRecord(type, data);
          if (!valid) {
            if (type !== 'unknown') warnings.push(`Skipped invalid ${type} in tax/${yearName}/record.ndjson`);
            continue;
          }
          if (type === 'taxYear') { taxYears.push(parsed as TaxYearRecord); inc('taxYear'); }
          else if (type === 'taxDocument') { documents.push(parsed as TaxDocument); inc('taxDocument'); }
        }
      }

      // checklist.ndjson
      const checklistContent = await reader.readFile(`${yearPath}/checklist.ndjson`);
      if (checklistContent) {
        for (const { type, data } of parseNdjsonLines(checklistContent, `tax/${yearName}/checklist.ndjson`, warnings)) {
          if (type === 'header') continue;
          const { valid, parsed } = validateRecord(type, data);
          if (!valid) { warnings.push(`Skipped invalid checklistItem in tax/${yearName}/checklist.ndjson`); continue; }
          if (type === 'checklistItem') { checklistItems.push(parsed as ChecklistItem); inc('checklistItem'); }
        }
      }

      // anomalies.ndjson
      const anomaliesContent = await reader.readFile(`${yearPath}/anomalies.ndjson`);
      if (anomaliesContent) {
        for (const { type, data } of parseNdjsonLines(anomaliesContent, `tax/${yearName}/anomalies.ndjson`, warnings)) {
          if (type === 'header') continue;
          const { valid, parsed } = validateRecord(type, data);
          if (!valid) { warnings.push(`Skipped invalid anomaly in tax/${yearName}/anomalies.ndjson`); continue; }
          if (type === 'anomaly') { anomalies.push(parsed as Anomaly); inc('anomaly'); }
        }
      }
    }
  }

  // --- Retirement plan ---
  let spending: SpendingPlan | null = null;
  let taxes: TaxConfig | null = null;
  let market: MarketConfig | null = null;
  let strategy: StrategyConfig | null = null;

  const planContent = await reader.readFile('retirement/plan.ndjson');
  if (planContent) {
    for (const { type, data } of parseNdjsonLines(planContent, 'retirement/plan.ndjson', warnings)) {
      if (type === 'header') continue;
      if (type === 'retirementPlan') {
        const { valid, parsed } = validateRecord(type, data);
        if (valid && parsed && typeof parsed === 'object') {
          const plan = parsed as { spending: SpendingPlan; taxes: TaxConfig; market: MarketConfig; strategy: StrategyConfig };
          spending = plan.spending;
          taxes = plan.taxes;
          market = plan.market;
          strategy = plan.strategy;
          inc('retirementPlan');
        } else {
          warnings.push('Skipped invalid retirementPlan record in retirement/plan.ndjson');
        }
      }
    }
  }

  // --- Retirement results (scenarios) ---
  const scenarios: Scenario[] = [];

  const resultsIsDir = await reader.isDirectory('retirement/results');
  if (resultsIsDir) {
    const resultFiles = await reader.listEntries('retirement/results');
    for (const fileName of resultFiles) {
      if (!fileName.endsWith('.ndjson')) continue;
      const scenarioId = fileName.replace(/\.ndjson$/, '');
      const resultContent = await reader.readFile(`retirement/results/${fileName}`);
      if (!resultContent) continue;

      for (const { type, data } of parseNdjsonLines(resultContent, `retirement/results/${fileName}`, warnings)) {
        if (type === 'header') continue;
        if (type === 'simulationResult') {
          const { valid, parsed } = validateRecord(type, data);
          if (valid && parsed && typeof parsed === 'object') {
            const simResult = parsed as PlanResult & { scenarioId: string };
            scenarios.push({
              id: simResult.scenarioId || scenarioId,
              name: `Scenario ${scenarioId}`,
              spending: spending ?? { targetAnnualSpend: 80000, inflationPct: 2.5, floorAnnualSpend: 60000, survivorSpendingAdjustmentPct: 70 },
              taxes: taxes ?? { federalModel: 'effective', stateModel: 'none', federalEffectiveRatePct: 22, capGainsRatePct: 15 },
              market: market ?? { simulationMode: 'deterministic', deterministicReturnPct: 7, deterministicInflationPct: 2.5 },
              strategy: strategy ?? { withdrawalOrder: 'taxableFirst', rebalanceFrequency: 'annual', guardrailsEnabled: false },
              result: simResult,
              runAt: new Date().toISOString(),
            });
            inc('simulationResult');
          }
        }
      }
    }
  }

  // --- Persist to IndexedDB ---
  try {
    await setAppState('shared', {
      household: household ?? useSharedStore.getState().household,
      accounts,
      incomeStreams,
      adjustments,
    });

    await setAppState('tax', { taxYears, documents, checklistItems, anomalies });

    if (spending && taxes && market && strategy) {
      await setAppState('retirement', {
        spending,
        taxes,
        market,
        strategy,
        scenarios,
        activeScenarioId: scenarios[0]?.id ?? null,
      });
    }
  } catch (err) {
    errors.push(`IndexedDB persist failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }

  // --- Update Zustand stores ---
  useSharedStore.setState({
    household: household ?? useSharedStore.getState().household,
    accounts,
    incomeStreams,
    adjustments,
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

  if (spending && taxes && market && strategy) {
    const activeId = scenarios[0]?.id ?? null;
    const latestResult = scenarios[0]?.result ?? null;
    useRetirementStore.setState({
      spending,
      taxes,
      market,
      strategy,
      scenarios,
      activeScenarioId: activeId,
      latestResult,
      initialized: true,
      persistError: null,
    });
  }

  return { recordCounts: counts, errors, warnings };
}
