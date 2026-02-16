import { z } from 'zod';
import { simulationModeSchema } from './common.js';

export const marketConfigSchema = z.object({
  simulationMode: simulationModeSchema,
  deterministicReturnPct: z.number().min(-100).max(100).optional(),
  deterministicInflationPct: z.number().min(-100).max(100).optional(),
  historicalScenarioIds: z.array(z.string()).optional(),
  stressScenarioIds: z.array(z.string()).optional(),
  monteCarloRuns: z.number().int().min(1).optional(),
});
