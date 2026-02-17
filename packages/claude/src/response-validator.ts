import type { ZodType } from 'zod';
import { portfolioAdviceResponseSchema, taxStrategyAdviceResponseSchema } from '@finplanner/validation';
import type { PortfolioAdviceResponse, TaxStrategyAdviceResponse } from '@finplanner/domain';

export type ValidationSuccess<T> = { success: true; data: T };
export type ValidationFailure = { success: false; error: string };
export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

/**
 * Strip markdown code fences that LLMs sometimes wrap around JSON responses.
 * Handles ```json ... ``` and plain ``` ... ``` fences.
 * Uses greedy matching to find the outermost fence pair, avoiding issues
 * with nested backticks inside JSON string values.
 */
function stripMarkdownFences(text: string): string {
  const trimmed = text.trim();
  // Match opening fence at the start and closing fence at the end (greedy)
  const fenced = trimmed.match(/^```\s*(?:json)?\s*\n?([\s\S]*)```\s*$/);
  return fenced ? fenced[1].trim() : trimmed;
}

function validateLlmResponse<T>(raw: string, schema: ZodType<T>): ValidationResult<T> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripMarkdownFences(raw));
  } catch (e) {
    return { success: false, error: `Invalid JSON: ${(e as Error).message}` };
  }

  const result = schema.safeParse(parsed);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    error: result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
  };
}

export function validatePortfolioResponse(raw: string): ValidationResult<PortfolioAdviceResponse> {
  return validateLlmResponse(raw, portfolioAdviceResponseSchema);
}

export function validateTaxResponse(raw: string): ValidationResult<TaxStrategyAdviceResponse> {
  return validateLlmResponse(raw, taxStrategyAdviceResponseSchema);
}
