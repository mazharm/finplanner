import type { TaxFormType } from '@finplanner/domain';

export interface TaxFormField {
  key: string;
  label: string;
  boxNumber: string;
  labelPatterns: string[];
  valueType: 'currency' | 'code';
  required: boolean;
}

export interface TaxFormTemplate {
  formType: TaxFormType;
  formIdentifiers: string[];
  fields: TaxFormField[];
}

export interface PdfExtractionResult {
  formType: TaxFormType;
  issuerName: string;
  extractedFields: Record<string, number | string>;
  fieldConfidence: Record<string, number>;
  extractionConfidence: number;
  lowConfidenceFields: string[];
}

export interface PdfTextExtractor {
  extractText(file: File): Promise<string>;
}
