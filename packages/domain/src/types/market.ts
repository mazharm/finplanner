import type { SimulationMode } from './common.js';

export interface MarketConfig {
  simulationMode: SimulationMode;
  deterministicReturnPct?: number;
  deterministicInflationPct?: number;
  historicalScenarioIds?: string[];
  stressScenarioIds?: string[];
  monteCarloRuns?: number;
}
