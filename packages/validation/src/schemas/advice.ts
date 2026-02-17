import { z } from 'zod';

const recommendationSchema = z.object({
  title: z.string().max(500),
  rationale: z.string().max(2000),
  expectedImpact: z.string().max(1000),
  tradeoffs: z.array(z.string().max(500)).max(10),
  source: z.enum(['llm', 'fallback']),
});

const shortAdviceSchema = z.object({
  title: z.string().max(500),
  rationale: z.string().max(2000),
});

export const portfolioAdviceResponseSchema = z.object({
  recommendations: z.array(recommendationSchema).max(25),
  withdrawalStrategyAdvice: z.array(shortAdviceSchema).max(25),
  riskFlags: z.array(z.string().max(500)).max(25),
  assumptionSensitivity: z.array(z.string().max(500)).max(25),
  disclaimer: z.string().max(2000),
});

export const taxStrategyAdviceResponseSchema = z.object({
  recommendations: z.array(recommendationSchema).max(25),
  taxOptimizationOpportunities: z.array(shortAdviceSchema).max(25),
  riskFlags: z.array(z.string().max(500)).max(25),
  disclaimer: z.string().max(2000),
});
