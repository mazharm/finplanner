/**
 * GT12: NDJSON Import/Restore Fidelity
 *
 * Fixture: Full dataset — household, 3 accounts, 2 income streams,
 * 2 adjustments, 1 retirement plan (spending+taxes+market+strategy),
 * 2 tax years, 4 docs, 3 checklist items, 2 anomalies.
 *
 * Assert: generateBackup() → valid NDJSON, line 1 = header with
 * schemaVersion: "3.0.0". validateImport() → valid: true, zero errors.
 * Record counts match. Field values match.
 */
import { describe, it, expect } from 'vitest';
import { validateImport, generateBackup } from '@finplanner/storage';
import type { OneDriveFile } from '@finplanner/storage';

const fixtureLines = [
  // Header
  '{"_type":"header","schemaVersion":"3.0.0","savedAt":"2025-06-01T00:00:00Z","modules":["retirement","tax","config"]}',

  // Household
  '{"_type":"household","maritalStatus":"married","filingStatus":"mfj","stateOfResidence":"WA","primary":{"id":"primary","birthYear":1980,"currentAge":45,"retirementAge":65,"lifeExpectancy":90},"spouse":{"id":"spouse","birthYear":1982,"currentAge":43,"retirementAge":65,"lifeExpectancy":92}}',

  // 3 Accounts
  '{"_type":"account","id":"acct-1","name":"Brokerage","type":"taxable","owner":"primary","currentBalance":500000,"expectedReturnPct":6,"feePct":0.1}',
  '{"_type":"account","id":"acct-2","name":"401k","type":"taxDeferred","owner":"primary","currentBalance":800000,"expectedReturnPct":7,"feePct":0.2}',
  '{"_type":"account","id":"acct-3","name":"Roth IRA","type":"roth","owner":"spouse","currentBalance":200000,"expectedReturnPct":6,"feePct":0.1}',

  // 2 Income streams
  '{"_type":"incomeStream","id":"ss-primary","name":"Primary SS","owner":"primary","startYear":2041,"annualAmount":30000,"colaPct":2,"taxable":true}',
  '{"_type":"incomeStream","id":"ss-spouse","name":"Spouse SS","owner":"spouse","startYear":2044,"annualAmount":20000,"colaPct":2,"taxable":true}',

  // 2 Adjustments
  '{"_type":"adjustment","id":"adj-1","name":"Inheritance","year":2030,"amount":100000,"taxable":false}',
  '{"_type":"adjustment","id":"adj-2","name":"Home sale","year":2035,"amount":200000,"taxable":true}',

  // 2 Tax year records
  '{"_type":"taxYear","taxYear":2024,"status":"filed","filingStatus":"mfj","stateOfResidence":"WA","income":{"wages":150000,"selfEmploymentIncome":0,"interestIncome":3000,"dividendIncome":8000,"qualifiedDividends":6000,"capitalGains":0,"capitalLosses":0,"rentalIncome":0,"nqdcDistributions":0,"retirementDistributions":0,"socialSecurityIncome":0,"otherIncome":0},"deductions":{"standardDeduction":30000,"useItemized":false},"credits":{"childTaxCredit":0,"educationCredits":0,"foreignTaxCredit":0,"otherCredits":0},"payments":{"federalWithheld":28000,"stateWithheld":0,"estimatedPaymentsFederal":0,"estimatedPaymentsState":0},"computedFederalTax":25000,"computedStateTax":0,"computedEffectiveFederalRate":15.5,"computedEffectiveStateRate":0,"documentIds":["doc-1","doc-2"]}',
  '{"_type":"taxYear","taxYear":2025,"status":"draft","filingStatus":"mfj","stateOfResidence":"WA","income":{"wages":155000,"selfEmploymentIncome":0,"interestIncome":3200,"dividendIncome":8500,"qualifiedDividends":6500,"capitalGains":0,"capitalLosses":0,"rentalIncome":0,"nqdcDistributions":0,"retirementDistributions":0,"socialSecurityIncome":0,"otherIncome":0},"deductions":{"standardDeduction":30000,"useItemized":false},"credits":{"childTaxCredit":0,"educationCredits":0,"foreignTaxCredit":0,"otherCredits":0},"payments":{"federalWithheld":29000,"stateWithheld":0,"estimatedPaymentsFederal":0,"estimatedPaymentsState":0},"computedFederalTax":0,"computedStateTax":0,"computedEffectiveFederalRate":0,"computedEffectiveStateRate":0,"documentIds":["doc-3","doc-4"]}',

  // 4 Tax documents
  '{"_type":"taxDocument","id":"doc-1","taxYear":2024,"formType":"W-2","issuerName":"Acme Corp","extractedFields":{"wages":150000},"fieldConfidence":{"wages":1},"extractionConfidence":0.95,"lowConfidenceFields":[],"confirmedByUser":true,"importedAt":"2025-02-01T00:00:00Z"}',
  '{"_type":"taxDocument","id":"doc-2","taxYear":2024,"formType":"1099-DIV","issuerName":"Vanguard","extractedFields":{"ordinaryDividends":8000},"fieldConfidence":{"ordinaryDividends":1},"extractionConfidence":0.95,"lowConfidenceFields":[],"confirmedByUser":true,"importedAt":"2025-02-01T00:00:00Z"}',
  '{"_type":"taxDocument","id":"doc-3","taxYear":2025,"formType":"W-2","issuerName":"Acme Corp","extractedFields":{"wages":155000},"fieldConfidence":{"wages":1},"extractionConfidence":0.95,"lowConfidenceFields":[],"confirmedByUser":true,"importedAt":"2026-02-01T00:00:00Z"}',
  '{"_type":"taxDocument","id":"doc-4","taxYear":2025,"formType":"1099-DIV","issuerName":"Vanguard","extractedFields":{"ordinaryDividends":8500},"fieldConfidence":{"ordinaryDividends":1},"extractionConfidence":0.95,"lowConfidenceFields":[],"confirmedByUser":true,"importedAt":"2026-02-01T00:00:00Z"}',

  // 3 Checklist items
  '{"_type":"checklistItem","id":"cl-1","taxYear":2025,"category":"document","description":"W-2 from Acme Corp","status":"received","sourceReasoning":"Prior year included W-2 from Acme Corp","linkedDocumentId":"doc-3"}',
  '{"_type":"checklistItem","id":"cl-2","taxYear":2025,"category":"document","description":"1099-DIV from Vanguard","status":"received","sourceReasoning":"Prior year included 1099-DIV from Vanguard","linkedDocumentId":"doc-4"}',
  '{"_type":"checklistItem","id":"cl-3","taxYear":2025,"category":"deadline","description":"Federal filing deadline: April 15, 2026","status":"pending","sourceReasoning":"Standard filing deadline"}',

  // 2 Anomalies
  '{"_type":"anomaly","id":"anom-1","taxYear":2025,"comparisonYear":2024,"category":"anomaly","severity":"info","field":"wages","description":"Wages increased by 3.3%","suggestedAction":"Review wage change"}',
  '{"_type":"anomaly","id":"anom-2","taxYear":2025,"comparisonYear":2024,"category":"anomaly","severity":"info","field":"dividendIncome","description":"Dividend income increased","suggestedAction":"Review dividend change"}',

  // AppConfig
  '{"_type":"appConfig","theme":"light","claudeModelId":"claude-sonnet-4-5-20250929","anomalyThresholdPct":25,"anomalyThresholdAbsolute":5000,"confidenceThreshold":0.8}',
];

const fixtureContent = fixtureLines.join('\n');

describe('GT12: NDJSON Import/Restore Fidelity', () => {
  it('should validate the original fixture as valid NDJSON', () => {
    const result = validateImport(fixtureContent);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.schemaVersion).toBe('3.0.0');
  });

  it('should have correct record counts in the original', () => {
    const result = validateImport(fixtureContent);
    expect(result.recordCounts.household).toBe(1);
    expect(result.recordCounts.account).toBe(3);
    expect(result.recordCounts.incomeStream).toBe(2);
    expect(result.recordCounts.adjustment).toBe(2);
    expect(result.recordCounts.taxYear).toBe(2);
    expect(result.recordCounts.taxDocument).toBe(4);
    expect(result.recordCounts.checklistItem).toBe(3);
    expect(result.recordCounts.anomaly).toBe(2);
    expect(result.recordCounts.appConfig).toBe(1);
  });

  describe('Round-trip: generateBackup → validateImport', () => {
    const files: OneDriveFile[] = [
      { name: 'data.ndjson', content: fixtureContent },
    ];
    const { content: backup } = generateBackup(files);
    const roundTripResult = validateImport(backup);

    it('should produce valid NDJSON from generateBackup', () => {
      expect(roundTripResult.valid).toBe(true);
      expect(roundTripResult.errors).toHaveLength(0);
    });

    it('should have header with schemaVersion 3.0.0 on first line', () => {
      const firstLine = JSON.parse(backup.split('\n')[0]);
      expect(firstLine._type).toBe('header');
      expect(firstLine.schemaVersion).toBe('3.0.0');
    });

    it('should preserve record counts through round-trip', () => {
      expect(roundTripResult.recordCounts.household).toBe(1);
      expect(roundTripResult.recordCounts.account).toBe(3);
      expect(roundTripResult.recordCounts.incomeStream).toBe(2);
      expect(roundTripResult.recordCounts.adjustment).toBe(2);
      expect(roundTripResult.recordCounts.taxYear).toBe(2);
      expect(roundTripResult.recordCounts.taxDocument).toBe(4);
      expect(roundTripResult.recordCounts.checklistItem).toBe(3);
      expect(roundTripResult.recordCounts.anomaly).toBe(2);
      expect(roundTripResult.recordCounts.appConfig).toBe(1);
    });

    it('should preserve field values through round-trip', () => {
      const lines = backup.split('\n').filter(l => l.trim());
      // Find the household record and verify fields
      const householdLine = lines.find(l => {
        try { return JSON.parse(l)._type === 'household'; } catch { return false; }
      });
      expect(householdLine).toBeDefined();
      const household = JSON.parse(householdLine!);
      expect(household.filingStatus).toBe('mfj');
      expect(household.stateOfResidence).toBe('WA');
      expect(household.primary.birthYear).toBe(1980);
    });

    it('should output records in canonical order', () => {
      const lines = backup.split('\n').filter(l => l.trim());
      const types = lines.map(l => JSON.parse(l)._type);

      // Header is first
      expect(types[0]).toBe('header');

      // Canonical: household → account → incomeStream → adjustment → taxYear → taxDocument → checklistItem → anomaly → appConfig
      const orderMap: Record<string, number> = {};
      for (let i = 0; i < types.length; i++) {
        if (!(types[i] in orderMap)) {
          orderMap[types[i]] = i;
        }
      }

      expect(orderMap['household']).toBeLessThan(orderMap['account']);
      expect(orderMap['account']).toBeLessThan(orderMap['incomeStream']);
      expect(orderMap['incomeStream']).toBeLessThan(orderMap['adjustment']);
      expect(orderMap['adjustment']).toBeLessThan(orderMap['taxYear']);
      expect(orderMap['taxYear']).toBeLessThan(orderMap['taxDocument']);
      expect(orderMap['taxDocument']).toBeLessThan(orderMap['checklistItem']);
      expect(orderMap['checklistItem']).toBeLessThan(orderMap['anomaly']);
      expect(orderMap['anomaly']).toBeLessThan(orderMap['appConfig']);
    });
  });

  describe('Multi-file consolidation', () => {
    const file1Content = [
      '{"_type":"header","schemaVersion":"3.0.0","savedAt":"2025-01-01T00:00:00Z","modules":["retirement"]}',
      '{"_type":"household","maritalStatus":"married","filingStatus":"mfj","stateOfResidence":"WA","primary":{"id":"primary","birthYear":1980,"currentAge":45,"retirementAge":65,"lifeExpectancy":90},"spouse":{"id":"spouse","birthYear":1982,"currentAge":43,"retirementAge":65,"lifeExpectancy":92}}',
      '{"_type":"account","id":"acct-1","name":"Brokerage","type":"taxable","owner":"primary","currentBalance":500000,"expectedReturnPct":6,"feePct":0.1}',
    ].join('\n');

    const file2Content = [
      '{"_type":"header","schemaVersion":"3.0.0","savedAt":"2025-02-01T00:00:00Z","modules":["tax"]}',
      '{"_type":"taxYear","taxYear":2024,"status":"filed","filingStatus":"mfj","stateOfResidence":"WA","income":{"wages":150000,"selfEmploymentIncome":0,"interestIncome":0,"dividendIncome":0,"qualifiedDividends":0,"capitalGains":0,"capitalLosses":0,"rentalIncome":0,"nqdcDistributions":0,"retirementDistributions":0,"socialSecurityIncome":0,"otherIncome":0},"deductions":{"standardDeduction":30000,"useItemized":false},"credits":{"childTaxCredit":0,"educationCredits":0,"foreignTaxCredit":0,"otherCredits":0},"payments":{"federalWithheld":28000,"stateWithheld":0,"estimatedPaymentsFederal":0,"estimatedPaymentsState":0},"computedFederalTax":25000,"computedStateTax":0,"computedEffectiveFederalRate":15.5,"computedEffectiveStateRate":0,"documentIds":[]}',
    ].join('\n');

    const files: OneDriveFile[] = [
      { name: 'retirement.ndjson', content: file1Content },
      { name: 'tax.ndjson', content: file2Content },
    ];

    const { content: backup } = generateBackup(files);
    const result = validateImport(backup);

    it('should consolidate multiple files into valid NDJSON', () => {
      expect(result.valid).toBe(true);
    });

    it('should have exactly one header line', () => {
      const lines = backup.split('\n').filter(l => l.trim());
      const headerCount = lines.filter(l => {
        try { return JSON.parse(l)._type === 'header'; } catch { return false; }
      }).length;
      expect(headerCount).toBe(1);
    });

    it('should include records from both files', () => {
      expect(result.recordCounts.household).toBe(1);
      expect(result.recordCounts.account).toBe(1);
      expect(result.recordCounts.taxYear).toBe(1);
    });
  });
});
