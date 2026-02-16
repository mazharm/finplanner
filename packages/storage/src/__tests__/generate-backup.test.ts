import { describe, it, expect } from 'vitest';
import { generateBackup } from '../generate-backup.js';
import { validateImport } from '../validate-import.js';
import type { OneDriveFile } from '../types.js';

describe('generateBackup', () => {
  it('produces valid NDJSON that passes validateImport', () => {
    const files: OneDriveFile[] = [{
      name: 'data.ndjson',
      content: [
        '{"_type":"header","schemaVersion":"3.0.0","savedAt":"2025-01-01T00:00:00Z","modules":["retirement"]}',
        '{"_type":"household","maritalStatus":"married","filingStatus":"mfj","stateOfResidence":"WA","primary":{"id":"primary","birthYear":1980,"currentAge":45,"retirementAge":65,"lifeExpectancy":90}}',
        '{"_type":"account","id":"acct-1","name":"Brokerage","type":"taxable","owner":"primary","currentBalance":500000,"expectedReturnPct":6,"feePct":0.1}',
      ].join('\n'),
    }];
    const backup = generateBackup(files);
    const result = validateImport(backup);
    expect(result.valid).toBe(true);
    expect(result.recordCounts.household).toBe(1);
    expect(result.recordCounts.account).toBe(1);
  });

  it('first line is a valid header with schemaVersion 3.0.0', () => {
    const files: OneDriveFile[] = [{
      name: 'data.ndjson',
      content: '{"_type":"header","schemaVersion":"3.0.0","savedAt":"2025-01-01T00:00:00Z","modules":["retirement"]}',
    }];
    const backup = generateBackup(files);
    const firstLine = JSON.parse(backup.split('\n')[0]);
    expect(firstLine._type).toBe('header');
    expect(firstLine.schemaVersion).toBe('3.0.0');
  });

  it('strips per-file headers and creates single consolidated header', () => {
    const files: OneDriveFile[] = [
      {
        name: 'file1.ndjson',
        content: [
          '{"_type":"header","schemaVersion":"3.0.0","savedAt":"2025-01-01T00:00:00Z","modules":["retirement"]}',
          '{"_type":"household","maritalStatus":"married","filingStatus":"mfj","stateOfResidence":"WA","primary":{"id":"primary","birthYear":1980,"currentAge":45,"retirementAge":65,"lifeExpectancy":90}}',
        ].join('\n'),
      },
      {
        name: 'file2.ndjson',
        content: [
          '{"_type":"header","schemaVersion":"3.0.0","savedAt":"2025-02-01T00:00:00Z","modules":["tax"]}',
          '{"_type":"account","id":"acct-1","name":"Brokerage","type":"taxable","owner":"primary","currentBalance":500000,"expectedReturnPct":6,"feePct":0.1}',
        ].join('\n'),
      },
    ];
    const backup = generateBackup(files);
    const lines = backup.split('\n');
    // Only one header (first line)
    const headerLines = lines.filter(l => {
      try { return JSON.parse(l)._type === 'header'; } catch { return false; }
    });
    expect(headerLines).toHaveLength(1);
  });

  it('outputs records in canonical order', () => {
    const files: OneDriveFile[] = [{
      name: 'data.ndjson',
      content: [
        '{"_type":"header","schemaVersion":"3.0.0","savedAt":"2025-01-01T00:00:00Z","modules":["retirement","tax"]}',
        '{"_type":"account","id":"acct-1","name":"Brokerage","type":"taxable","owner":"primary","currentBalance":500000,"expectedReturnPct":6,"feePct":0.1}',
        '{"_type":"household","maritalStatus":"married","filingStatus":"mfj","stateOfResidence":"WA","primary":{"id":"primary","birthYear":1980,"currentAge":45,"retirementAge":65,"lifeExpectancy":90}}',
      ].join('\n'),
    }];
    const backup = generateBackup(files);
    const lines = backup.split('\n').filter(l => l.trim());
    const types = lines.map(l => JSON.parse(l)._type);
    // header first, then household before account (canonical order)
    expect(types[0]).toBe('header');
    expect(types.indexOf('household')).toBeLessThan(types.indexOf('account'));
  });

  it('strips API key fields from appConfig', () => {
    const files: OneDriveFile[] = [{
      name: 'config.ndjson',
      content: [
        '{"_type":"header","schemaVersion":"3.0.0","savedAt":"2025-01-01T00:00:00Z","modules":["config"]}',
        '{"_type":"appConfig","theme":"light","claudeModelId":"claude-sonnet-4-5-20250929","anomalyThresholdPct":25,"anomalyThresholdAbsolute":5000,"confidenceThreshold":0.8,"claudeApiKey":"sk-ant-secret123"}',
      ].join('\n'),
    }];
    const backup = generateBackup(files);
    expect(backup).not.toContain('sk-ant-secret123');
    expect(backup).not.toContain('claudeApiKey');
  });
});
