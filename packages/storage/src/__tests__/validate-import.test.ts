import { describe, it, expect } from 'vitest';
import { validateImport } from '../validate-import.js';

const VALID_HEADER = '{"_type":"header","schemaVersion":"3.0.0","savedAt":"2025-06-01T00:00:00Z","modules":["tax","retirement"]}';

describe('validateImport', () => {
  it('validates a well-formed NDJSON file', () => {
    const content = [
      VALID_HEADER,
      '{"_type":"household","maritalStatus":"married","filingStatus":"mfj","stateOfResidence":"WA","primary":{"id":"primary","birthYear":1980,"currentAge":45,"retirementAge":65,"lifeExpectancy":90},"spouse":{"id":"spouse","birthYear":1982,"currentAge":43,"retirementAge":65,"lifeExpectancy":88}}',
    ].join('\n');
    const result = validateImport(content);
    expect(result.valid).toBe(true);
    expect(result.recordCounts.household).toBe(1);
  });

  it('rejects empty content', () => {
    const result = validateImport('');
    expect(result.valid).toBe(false);
  });

  it('rejects invalid header JSON', () => {
    const result = validateImport('not json');
    expect(result.valid).toBe(false);
  });

  it('rejects schema version < 2.0.0', () => {
    const content = '{"_type":"header","schemaVersion":"1.5.0","savedAt":"2025-01-01T00:00:00Z","modules":["tax"]}';
    const result = validateImport(content);
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toContain('too old');
  });

  it('reports validation errors for malformed records', () => {
    const content = [
      VALID_HEADER,
      '{"_type":"account","name":"test"}', // missing required fields
    ].join('\n');
    const result = validateImport(content);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('accepts schema version 3.0.0', () => {
    const result = validateImport(VALID_HEADER);
    expect(result.valid).toBe(true);
    expect(result.schemaVersion).toBe('3.0.0');
  });

  it('counts records by type', () => {
    const content = [
      VALID_HEADER,
      '{"_type":"household","maritalStatus":"married","filingStatus":"mfj","stateOfResidence":"WA","primary":{"id":"primary","birthYear":1980,"currentAge":45,"retirementAge":65,"lifeExpectancy":90},"spouse":{"id":"spouse","birthYear":1982,"currentAge":43,"retirementAge":65,"lifeExpectancy":88}}',
      '{"_type":"household","maritalStatus":"single","filingStatus":"single","stateOfResidence":"CA","primary":{"id":"primary","birthYear":1990,"currentAge":35,"retirementAge":67,"lifeExpectancy":88}}',
    ].join('\n');
    const result = validateImport(content);
    expect(result.valid).toBe(true);
    expect(result.recordCounts.household).toBe(2);
  });
});
