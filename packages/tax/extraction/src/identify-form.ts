import type { TaxFormType } from '@finplanner/domain';
import type { TaxFormTemplate } from './types.js';
import { getTemplates } from './templates.js';

export interface FormIdentificationResult {
  formType: TaxFormType;
  confidence: number;
  template: TaxFormTemplate;
}

export function identifyFormType(text: string): FormIdentificationResult | null {
  const upperText = text.toUpperCase();
  let bestMatch: FormIdentificationResult | null = null;
  let bestScore = 0;

  for (const template of getTemplates()) {
    let matchCount = 0;
    for (const id of template.formIdentifiers) {
      if (upperText.includes(id.toUpperCase())) {
        matchCount++;
      }
    }
    if (matchCount > 0) {
      const score = matchCount / template.formIdentifiers.length;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = {
          formType: template.formType,
          confidence: Math.min(1.0, score + 0.3), // boost: even 1 match is decent
          template,
        };
      }
    }
  }

  return bestMatch;
}
