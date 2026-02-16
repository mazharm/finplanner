import type { TaxDocument } from '@finplanner/domain';
import { DEFAULT_CONFIDENCE_THRESHOLD } from '@finplanner/domain';
import type { PdfTextExtractor, PdfExtractionResult } from './types.js';
import { identifyFormType } from './identify-form.js';
import { extractFieldsFromText } from './extract-fields.js';
import { extractIssuerName } from './extract-issuer.js';

export function extractFromText(
  text: string,
  taxYear: number,
  threshold: number = DEFAULT_CONFIDENCE_THRESHOLD
): PdfExtractionResult {
  if (!text || text.trim().length === 0) {
    throw new Error('PDF_PARSE_FAILED');
  }

  const identification = identifyFormType(text);
  if (!identification) {
    throw new Error('PDF_FORM_UNRECOGNIZED');
  }

  const fields = extractFieldsFromText(text, identification.template, threshold);
  const issuerName = extractIssuerName(text, identification.formType);

  return {
    formType: identification.formType,
    issuerName,
    extractedFields: fields.extractedFields,
    fieldConfidence: fields.fieldConfidence,
    extractionConfidence: Math.min(identification.confidence, fields.overallConfidence),
    lowConfidenceFields: fields.lowConfidenceFields,
  };
}

export async function extractPdfFields(
  file: File,
  taxYear: number,
  extractor: PdfTextExtractor
): Promise<PdfExtractionResult> {
  const text = await extractor.extractText(file);
  return extractFromText(text, taxYear);
}
