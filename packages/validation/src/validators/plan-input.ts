import type { PlanInput } from '@finplanner/domain';
import { planInputSchema } from '../schemas/plan-input.js';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validatePlanInput(input: unknown): ValidationResult {
  const result = planInputSchema.safeParse(input);
  if (result.success) {
    return { valid: true, errors: [] };
  }
  return {
    valid: false,
    errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
  };
}
