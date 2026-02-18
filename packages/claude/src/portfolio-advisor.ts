import type { PortfolioAdviceRequest, PortfolioAdviceResponse } from '@finplanner/domain';
import type { LlmClient } from './types.js';
import { stripPortfolioPii } from './pii-strip.js';
import { buildPortfolioPrompt } from './prompt-builder.js';
import { validatePortfolioResponse } from './response-validator.js';
import { getPortfolioFallbackAdvice } from './fallback-advice.js';

export async function getPortfolioAdvice(
  request: PortfolioAdviceRequest,
  client?: LlmClient,
): Promise<PortfolioAdviceResponse> {
  if (!client) {
    return getPortfolioFallbackAdvice(request);
  }

  const ctx = stripPortfolioPii(request);
  const { system, user } = buildPortfolioPrompt(ctx);

  let raw: string;
  try {
    raw = await client.sendMessage(system, user);
    console.info('[FinPlanner] Portfolio advice LLM request completed. Anonymized context size:', user.length, 'chars');
  } catch (error) {
    return getPortfolioFallbackAdvice(request);
  }

  const result = validatePortfolioResponse(raw);
  if (result.success) {
    return result.data;
  }

  // Retry once with corrective prompt — sanitize error string to prevent injection via malformed LLM output
  const retryUser = `${user}\n\nYour previous response was not valid JSON matching the expected schema. Please respond again with valid JSON matching the schema exactly.`;
  let retryRaw: string;
  try {
    retryRaw = await client.sendMessage(system, retryUser);
  } catch (error) {
    console.warn('[FinPlanner] Portfolio advice LLM retry failed:', error instanceof Error ? error.message : String(error));
    return getPortfolioFallbackAdvice(request);
  }

  const retryResult = validatePortfolioResponse(retryRaw);
  if (retryResult.success) {
    return retryResult.data;
  }

  return getPortfolioFallbackAdvice(request);
}
