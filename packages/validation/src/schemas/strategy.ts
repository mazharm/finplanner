import { z } from 'zod';

export const strategyConfigSchema = z.object({
  withdrawalOrder: z.enum(['taxableFirst', 'taxDeferredFirst', 'proRata', 'taxOptimized']),
  rebalanceFrequency: z.enum(['none', 'annual', 'quarterly']),
  guardrailsEnabled: z.boolean(),
});
