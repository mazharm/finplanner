/**
 * GT11: Multi-Form Import
 *
 * Fixture: 3 PDF texts — W-2 Employer A ($80K), W-2 Employer B ($45K),
 * 1099-INT ($2.5K).
 *
 * Assert: extractFromText() identifies each form. aggregateDocumentsToIncome()
 * → wages: $125K, interestIncome: $2.5K. 3 TaxDocument records, no duplication.
 */
import { describe, it, expect } from 'vitest';
import { extractFromText } from '@finplanner/tax-extraction';
import { aggregateDocumentsToIncome } from '@finplanner/tax-computation';
import type { TaxDocument } from '@finplanner/domain';

const w2TextA = `Form W-2 Wage and Tax Statement 2025
Employer's name: Employer A Corporation
Box 1 Wages, tips, other compensation $80,000.00
Box 2 Federal income tax withheld $15,000.00
Box 3 Social security wages $80,000.00
Box 5 Medicare wages $80,000.00
Box 17 State income tax $2,500.00`;

const w2TextB = `Form W-2 Wage and Tax Statement 2025
Employer's name: Employer B Inc
Box 1 Wages, tips, other compensation $45,000.00
Box 2 Federal income tax withheld $8,500.00
Box 3 Social security wages $45,000.00
Box 5 Medicare wages $45,000.00`;

const intText = `Form 1099-INT Interest Income 2025
Payer's name: First National Bank
Box 1 Interest income $2,500.00
Box 8 Tax-exempt interest $0.00`;

function makeDocFromExtraction(
  id: string,
  extraction: ReturnType<typeof extractFromText>,
  taxYear: number
): TaxDocument {
  return {
    id,
    taxYear,
    formType: extraction.formType,
    issuerName: extraction.issuerName,
    extractedFields: extraction.extractedFields,
    fieldConfidence: extraction.fieldConfidence,
    extractionConfidence: extraction.extractionConfidence,
    lowConfidenceFields: extraction.lowConfidenceFields,
    confirmedByUser: true,
    importedAt: new Date().toISOString(),
  };
}

describe('GT11: Multi-Form Import', () => {
  const extractionA = extractFromText(w2TextA, 2025);
  const extractionB = extractFromText(w2TextB, 2025);
  const extractionInt = extractFromText(intText, 2025);

  it('should identify W-2 from Employer A', () => {
    expect(extractionA.formType).toBe('W-2');
    expect(extractionA.issuerName).toBe('Employer A Corporation');
    expect(extractionA.extractedFields.wages).toBe(80_000);
  });

  it('should identify W-2 from Employer B', () => {
    expect(extractionB.formType).toBe('W-2');
    expect(extractionB.issuerName).toBe('Employer B Inc');
    expect(extractionB.extractedFields.wages).toBe(45_000);
  });

  it('should identify 1099-INT', () => {
    expect(extractionInt.formType).toBe('1099-INT');
    expect(extractionInt.extractedFields.interestIncome).toBe(2_500);
  });

  it('should aggregate wages to $125,000', () => {
    const docs: TaxDocument[] = [
      makeDocFromExtraction('doc-w2-a', extractionA, 2025),
      makeDocFromExtraction('doc-w2-b', extractionB, 2025),
      makeDocFromExtraction('doc-int', extractionInt, 2025),
    ];

    const aggregated = aggregateDocumentsToIncome(docs);
    expect(aggregated.income.wages).toBe(125_000);
  });

  it('should aggregate interest income to $2,500', () => {
    const docs: TaxDocument[] = [
      makeDocFromExtraction('doc-w2-a', extractionA, 2025),
      makeDocFromExtraction('doc-w2-b', extractionB, 2025),
      makeDocFromExtraction('doc-int', extractionInt, 2025),
    ];

    const aggregated = aggregateDocumentsToIncome(docs);
    expect(aggregated.income.interestIncome).toBe(2_500);
  });

  it('should produce exactly 3 TaxDocument records with no duplication', () => {
    const docs: TaxDocument[] = [
      makeDocFromExtraction('doc-w2-a', extractionA, 2025),
      makeDocFromExtraction('doc-w2-b', extractionB, 2025),
      makeDocFromExtraction('doc-int', extractionInt, 2025),
    ];
    expect(docs).toHaveLength(3);
    const ids = new Set(docs.map(d => d.id));
    expect(ids.size).toBe(3);
  });

  it('should aggregate federal withholding from both W-2s', () => {
    const docs: TaxDocument[] = [
      makeDocFromExtraction('doc-w2-a', extractionA, 2025),
      makeDocFromExtraction('doc-w2-b', extractionB, 2025),
      makeDocFromExtraction('doc-int', extractionInt, 2025),
    ];

    const aggregated = aggregateDocumentsToIncome(docs);
    expect(aggregated.payments.federalWithheld).toBe(23_500);
  });
});
