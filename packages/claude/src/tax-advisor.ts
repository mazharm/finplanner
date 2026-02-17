import type { TaxStrategyAdviceRequest, TaxStrategyAdviceResponse, TaxDocument } from '@finplanner/domain';
import type { LlmClient } from './types.js';
import { stripTaxPii } from './pii-strip.js';
import { buildTaxPrompt } from './prompt-builder.js';
import { validateTaxResponse } from './response-validator.js';
import { getTaxFallbackAdvice } from './fallback-advice.js';

export async function getTaxStrategyAdvice(
  request: TaxStrategyAdviceRequest,
  client?: LlmClient,
  documents?: TaxDocument[],
): Promise<TaxStrategyAdviceResponse> {
  if (!client) {
    return getTaxFallbackAdvice(request);
  }

  const ctx = stripTaxPii(request, documents);
  const { system, user } = buildTaxPrompt(ctx);

  let raw: string;
  try {
    raw = await client.sendMessage(system, user);
  } catch (error) {
    console.warn('[FinPlanner] Tax advice LLM call failed:', error instanceof Error ? error.message : String(error));
    return getTaxFallbackAdvice(request);
  }

  const result = validateTaxResponse(raw);
  if (result.success) {
    return result.data;
  }

  // Retry once with corrective prompt — sanitize error string to prevent injection via malformed LLM output
  const retryUser = `${user}\n\nYour previous response was not valid JSON matching the expected schema. Please respond again with valid JSON matching the schema exactly.`;
  let retryRaw: string;
  try {
    retryRaw = await client.sendMessage(system, retryUser);
  } catch (error) {
    console.warn('[FinPlanner] Tax advice LLM retry failed:', error instanceof Error ? error.message : String(error));
    return getTaxFallbackAdvice(request);
  }

  const retryResult = validateTaxResponse(retryRaw);
  if (retryResult.success) {
    return retryResult.data;
  }

  return getTaxFallbackAdvice(request);
}
