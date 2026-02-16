import { z } from 'zod';

export const appConfigSchema = z.object({
  theme: z.enum(['light', 'dark']),
  claudeModelId: z.string(),
  anomalyThresholdPct: z.number().min(0).max(100),
  anomalyThresholdAbsolute: z.number().min(0),
  confidenceThreshold: z.number().min(0).max(1),
  lastSyncTimestamp: z.string().optional(),
});
