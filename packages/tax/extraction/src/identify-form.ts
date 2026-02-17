import type { TaxFormType } from '@finplanner/domain';
import type { TaxFormTemplate } from './types.js';
import { getTemplates } from './templates.js';

export interface FormIdentificationResult {
  formType: TaxFormType;
  confidence: number;
  template: TaxFormTemplate;
}

/**
 * Check if the identifier appears in the text as a whole word/token,
 * using word-boundary matching to avoid partial matches
 * (e.g., "1099-INT" should not match inside "1099-INTEREST").
 */
function hasWordBoundaryMatch(text: string, identifier: string): boolean {
  // Escape regex special characters in the identifier
  const escaped = identifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`\\b${escaped}\\b`, 'i');
  return pattern.test(text);
}

/**
 * Check if the text contains 1098-T or 1098-E variants that should NOT
 * match the generic 1098 (mortgage) template.
 */
function has1098Variant(text: string): boolean {
  return /\b1098[- ]?[TE]\b/i.test(text);
}

export function identifyFormType(text: string): FormIdentificationResult | null {
  const upperText = text.toUpperCase();
  let bestMatch: FormIdentificationResult | null = null;
  let bestScore = 0;

  for (const template of getTemplates()) {
    // For the generic 1098 (mortgage) form, skip if text contains 1098-T or 1098-E
    if (template.formType === '1098' && has1098Variant(text)) {
      continue;
    }

    let matchCount = 0;
    for (const id of template.formIdentifiers) {
      if (hasWordBoundaryMatch(text, id)) {
        matchCount++;
      }
    }
    if (matchCount > 0) {
      // Allow single match if it's the primary identifier (first in the array);
      // require 2+ matches for secondary identifiers only
      const primaryMatched = hasWordBoundaryMatch(text, template.formIdentifiers[0]);
      if (matchCount < 2 && matchCount < template.formIdentifiers.length && !primaryMatched) {
        continue;
      }

      // Score combines match ratio with absolute match bonus
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
