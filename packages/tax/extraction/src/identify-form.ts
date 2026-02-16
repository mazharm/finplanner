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
      // Skip: single match on a multi-identifier template is unreliable
      if (matchCount < 2 && matchCount < template.formIdentifiers.length) {
        continue;
      }

      // Score combines match ratio with absolute match bonus
      // Minimum 2 matches required for a valid identification (or all identifiers matched)
      const matchRatio = matchCount / template.formIdentifiers.length;
      const absoluteBonus = Math.min(matchCount / 5, 0.2); // up to 0.2 bonus for more matches
      const score = matchRatio + absoluteBonus;

      if (score > bestScore) {
        bestScore = score;
        bestMatch = {
          formType: template.formType,
          confidence: Math.min(1.0, score + 0.3),
          template,
        };
      }
    }
  }

  return bestMatch;
}
