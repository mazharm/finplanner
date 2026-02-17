import { z } from 'zod';
import { simulationModeSchema } from './common.js';

export const marketConfigSchema = z.object({
  simulationMode: simulationModeSchema,
  deterministicReturnPct: z.number().min(-100).max(100).optional(),
  deterministicInflationPct: z.number().min(-100).max(100).optional(),
  historicalScenarioIds: z.array(z.string()).optional(),
  stressScenarioIds: z.array(z.string()).optional(),
  monteCarloRuns: z.number().int().min(1).max(100000).optional(),
}).refine(
  (data) => data.simulationMode !== 'monteCarlo' || data.monteCarloRuns !== undefined,
  { message: 'monteCarloRuns is required when simulationMode is "monteCarlo"', path: ['monteCarloRuns'] }
).refine(
  (data) => data.simulationMode !== 'historical' || (data.historicalScenarioIds !== undefined && data.historicalScenarioIds.length > 0),
  { message: 'historicalScenarioIds is required when simulationMode is "historical"', path: ['historicalScenarioIds'] }
);
// Note: deterministic mode does NOT require deterministicReturnPct. When omitted,
// the engine falls back to each account's individual expectedReturnPct. This is the
// common case in golden test fixtures and production usage.
