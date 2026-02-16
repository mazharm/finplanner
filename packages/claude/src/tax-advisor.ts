import type { TaxStrategyAdviceRequest, TaxStrategyAdviceResponse } from '@finplanner/domain';
import type { LlmClient } from './types.js';
import { stripTaxPii } from './pii-strip.js';
import { buildTaxPrompt } from './prompt-builder.js';
import { validateTaxResponse } from './response-validator.js';
import { getTaxFallbackAdvice } from './fallback-advice.js';

export async function getTaxStrategyAdvice(
  request: TaxStrategyAdviceRequest,
  client?: LlmClient,
): Promise<TaxStrategyAdviceResponse> {
  if (!client) {
    return getTaxFallbackAdvice(request);
  }

  const ctx = stripTaxPii(request);
  const { system, user } = buildTaxPrompt(ctx);

  let raw: string;
  try {
    raw = await client.sendMessage(system, user);
  } catch {
    return getTaxFallbackAdvice(request);
  }

  const result = validateTaxResponse(raw);
  if (result.success) {
    return result.data;
  }

  // Retry once with corrective prompt
  const retryUser = `${user}\n\nYour previous response had validation errors: ${result.error}\n\nPlease respond again with valid JSON matching the schema exactly.`;
  let retryRaw: string;
  try {
    retryRaw = await client.sendMessage(system, retryUser);
  } catch {
    return getTaxFallbackAdvice(request);
  }

  const retryResult = validateTaxResponse(retryRaw);
  if (retryResult.success) {
    return retryResult.data;
  }

  return getTaxFallbackAdvice(request);
}
