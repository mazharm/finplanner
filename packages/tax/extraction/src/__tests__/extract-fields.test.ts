import { describe, it, expect } from 'vitest';
import { extractFieldsFromText } from '../extract-fields.js';
import { getTemplateByFormType } from '../templates.js';
import { extractFromText } from '../extract-pdf-fields.js';

describe('extractFieldsFromText', () => {
  it('extracts W-2 wages and withholding', () => {
    const template = getTemplateByFormType('W-2')!;
    const text = 'Wages, tips, other compensation $80,000.00\nFederal income tax withheld $15,000.00\nState income tax $3,000.00';
    const result = extractFieldsFromText(text, template);
    expect(result.extractedFields.wages).toBe(80_000);
    expect(result.extractedFields.federalTaxWithheld).toBe(15_000);
    expect(result.extractedFields.stateTaxWithheld).toBe(3_000);
  });

  it('extracts 1099-INT interest', () => {
    const template = getTemplateByFormType('1099-INT')!;
    const text = 'Interest income $2,500.00\nTax-exempt interest $500.00';
    const result = extractFieldsFromText(text, template);
    expect(result.extractedFields.interestIncome).toBe(2_500);
  });

  it('handles currency values without dollar sign', () => {
    const template = getTemplateByFormType('W-2')!;
    const text = 'Wages, tips, other compensation 80000.00';
    const result = extractFieldsFromText(text, template);
    expect(result.extractedFields.wages).toBe(80_000);
  });

  it('reports low confidence for missing required fields', () => {
    const template = getTemplateByFormType('W-2')!;
    const text = 'Some random text with no matching fields';
    const result = extractFieldsFromText(text, template);
    expect(result.lowConfidenceFields.length).toBeGreaterThan(0);
    expect(result.overallConfidence).toBe(0);
  });
});

describe('extractFromText', () => {
  it('throws PDF_PARSE_FAILED for empty text', () => {
    expect(() => extractFromText('', 2025)).toThrow('PDF_PARSE_FAILED');
  });

  it('throws PDF_FORM_UNRECOGNIZED for unrecognizable text', () => {
    expect(() => extractFromText('random unrelated text with no form markers', 2025)).toThrow('PDF_FORM_UNRECOGNIZED');
  });

  it('extracts a full W-2 from realistic text', () => {
    const text = `Form W-2 Wage and Tax Statement 2025
Employer's name: Acme Corporation
Box 1 Wages, tips, other compensation $80,000.00
Box 2 Federal income tax withheld $15,000.00
Box 3 Social security wages $80,000.00
Box 5 Medicare wages $80,000.00
Box 16 State wages $80,000.00
Box 17 State income tax $3,000.00`;
    const result = extractFromText(text, 2025);
    expect(result.formType).toBe('W-2');
    expect(result.issuerName).toBe('Acme Corporation');
    expect(result.extractedFields.wages).toBe(80_000);
    expect(result.extractedFields.federalTaxWithheld).toBe(15_000);
  });
});
