import { z } from 'zod';

const recommendationSchema = z.object({
  title: z.string(),
  rationale: z.string(),
  expectedImpact: z.string(),
  tradeoffs: z.array(z.string()),
  source: z.enum(['llm', 'fallback']),
});

export const portfolioAdviceResponseSchema = z.object({
  recommendations: z.array(recommendationSchema),
  withdrawalStrategyAdvice: z.array(z.object({ title: z.string(), rationale: z.string() })),
  riskFlags: z.array(z.string()),
  assumptionSensitivity: z.array(z.string()),
  disclaimer: z.string(),
});

export const taxStrategyAdviceResponseSchema = z.object({
  recommendations: z.array(recommendationSchema),
  taxOptimizationOpportunities: z.array(z.object({ title: z.string(), rationale: z.string() })),
  riskFlags: z.array(z.string()),
  disclaimer: z.string(),
});
