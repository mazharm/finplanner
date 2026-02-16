import { portfolioAdviceResponseSchema, taxStrategyAdviceResponseSchema } from '@finplanner/validation';
import type { PortfolioAdviceResponse, TaxStrategyAdviceResponse } from '@finplanner/domain';

export type ValidationSuccess<T> = { success: true; data: T };
export type ValidationFailure = { success: false; error: string };
export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

export function validatePortfolioResponse(
  raw: string,
): ValidationResult<PortfolioAdviceResponse> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    return { success: false, error: `Invalid JSON: ${(e as Error).message}` };
  }

  const result = portfolioAdviceResponseSchema.safeParse(parsed);
  if (result.success) {
    return { success: true, data: result.data as PortfolioAdviceResponse };
  }
  return {
    success: false,
    error: result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
  };
}

export function validateTaxResponse(
  raw: string,
): ValidationResult<TaxStrategyAdviceResponse> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    return { success: false, error: `Invalid JSON: ${(e as Error).message}` };
  }

  const result = taxStrategyAdviceResponseSchema.safeParse(parsed);
  if (result.success) {
    return { success: true, data: result.data as TaxStrategyAdviceResponse };
  }
  return {
    success: false,
    error: result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
  };
}
