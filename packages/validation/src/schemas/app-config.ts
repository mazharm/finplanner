import { z } from 'zod';

export const appConfigSchema = z.object({
  theme: z.enum(['light', 'dark']),
  claudeModelId: z.string().min(1).max(200).regex(/^[a-zA-Z0-9_:.-]+$/, 'Must be a valid model ID'),
  anomalyThresholdPct: z.number().min(0).max(100),
  anomalyThresholdAbsolute: z.number().min(0),
  confidenceThreshold: z.number().min(0).max(1),
  lastSyncTimestamp: z.string().datetime({ offset: true }).optional(),
});
