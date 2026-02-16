import type { TaxFormField, TaxFormTemplate } from './types.js';
import { DEFAULT_CONFIDENCE_THRESHOLD } from '@finplanner/domain';

const CURRENCY_REGEX = /\$?\s*([\d,]+\.?\d*)/;

function parseCurrencyValue(text: string): number | null {
  const match = text.match(CURRENCY_REGEX);
  if (!match) return null;
  const cleaned = match[1].replace(/,/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

export interface FieldExtractionResult {
  extractedFields: Record<string, number | string>;
  fieldConfidence: Record<string, number>;
  lowConfidenceFields: string[];
  overallConfidence: number;
}

export function extractFieldsFromText(
  text: string,
  template: TaxFormTemplate,
  threshold: number = DEFAULT_CONFIDENCE_THRESHOLD
): FieldExtractionResult {
  const extractedFields: Record<string, number | string> = {};
  const fieldConfidence: Record<string, number> = {};
  const lowConfidenceFields: string[] = [];
  let totalConfidence = 0;
  let fieldCount = 0;

  for (const field of template.fields) {
    const result = extractSingleField(text, field);
    if (result !== null) {
      extractedFields[field.key] = result.value;
      fieldConfidence[field.key] = result.confidence;
      totalConfidence += result.confidence;
      fieldCount++;
      if (result.confidence < threshold) {
        lowConfidenceFields.push(field.key);
      }
    } else if (field.required) {
      // Required field missing - lower confidence
      fieldConfidence[field.key] = 0;
      lowConfidenceFields.push(field.key);
      fieldCount++;
    }
  }

  const overallConfidence = fieldCount > 0 ? totalConfidence / fieldCount : 0;

  return { extractedFields, fieldConfidence, lowConfidenceFields, overallConfidence };
}

function extractSingleField(
  text: string,
  field: TaxFormField
): { value: number | string; confidence: number } | null {
  // Try each label pattern, iterating through ALL matches (not just the first)
  // to avoid capturing values from header lines (e.g., "Form 1099-INT Interest Income 2025")
  for (const patternStr of field.labelPatterns) {
    const pattern = new RegExp(patternStr, 'gi');
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(text)) !== null) {
      // Get text after the match to find the value
      const afterMatch = text.substring(match.index + match[0].length, match.index + match[0].length + 100);

      if (field.valueType === 'currency') {
        // Prefer values with explicit $ sign (higher confidence they're currency, not years)
        const dollarMatch = afterMatch.match(/\$\s*([\d,]+\.?\d*)/);
        if (dollarMatch) {
          const cleaned = dollarMatch[1].replace(/,/g, '');
          const num = parseFloat(cleaned);
          if (!isNaN(num)) {
            return { value: num, confidence: 1.0 };
          }
        }
        // Fall back to bare number only if no more matches of this pattern exist
        const value = parseCurrencyValue(afterMatch);
        if (value !== null) {
          // Check if there's another match of the same pattern further in the text
          // If so, skip this one (it's likely a header match)
          const nextMatch = pattern.exec(text);
          if (nextMatch) {
            // Reset pattern to re-try from this next match
            pattern.lastIndex = nextMatch.index;
            continue;
          }
          return { value, confidence: 0.8 };
        }
      } else {
        // code type - extract next non-whitespace token
        const codeMatch = afterMatch.match(/\s*(\S+)/);
        if (codeMatch) {
          return { value: codeMatch[1], confidence: 1.0 };
        }
      }
    }
  }

  return null;
}
