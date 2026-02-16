import { SCHEMA_VERSION } from '@finplanner/domain';
import { ndjsonHeaderSchema } from '@finplanner/validation';
import type { ImportValidationResult, ImportLineError } from './types.js';
import { getSchemaForType } from './ndjson-schemas.js';

function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((parts1[i] ?? 0) < (parts2[i] ?? 0)) return -1;
    if ((parts1[i] ?? 0) > (parts2[i] ?? 0)) return 1;
  }
  return 0;
}

export function validateImport(ndjsonContent: string): ImportValidationResult {
  const lines = ndjsonContent.split('\n').filter(l => l.trim().length > 0);
  const errors: ImportLineError[] = [];
  const recordCounts: Record<string, number> = {};
  let schemaVersion: string | undefined;

  if (lines.length === 0) {
    return { valid: false, errors: [{ line: 1, message: 'Empty file' }], recordCounts };
  }

  // Line 1: header
  let header: any;
  try {
    header = JSON.parse(lines[0]);
  } catch {
    errors.push({ line: 1, message: 'Invalid JSON on header line', raw: lines[0] });
    return { valid: false, errors, recordCounts };
  }

  const headerResult = ndjsonHeaderSchema.safeParse(header);
  if (!headerResult.success) {
    errors.push({ line: 1, message: `Invalid header: ${headerResult.error.message}` });
    return { valid: false, errors, recordCounts };
  }

  schemaVersion = headerResult.data.schemaVersion;

  // Version check
  if (compareVersions(schemaVersion, '2.0.0') < 0) {
    errors.push({ line: 1, message: `Schema version ${schemaVersion} is too old (< 2.0.0)` });
    return { valid: false, errors, recordCounts, schemaVersion };
  }

  // Parse remaining lines
  for (let i = 1; i < lines.length; i++) {
    const lineNum = i + 1;
    let record: any;
    try {
      record = JSON.parse(lines[i]);
    } catch {
      errors.push({ line: lineNum, message: 'Invalid JSON', raw: lines[i] });
      continue;
    }

    const type = record._type;
    if (!type) {
      errors.push({ line: lineNum, message: 'Missing _type field' });
      continue;
    }

    // Skip nested headers (from consolidated files)
    if (type === 'header') continue;

    const schema = getSchemaForType(type);
    if (!schema) {
      errors.push({ line: lineNum, message: `Unknown record type: ${type}` });
      continue;
    }

    // Strip _type before validating against the schema (schemas don't include _type)
    const { _type, ...data } = record;
    const result = schema.safeParse(data);
    if (!result.success) {
      errors.push({ line: lineNum, message: `Validation error for ${type}: ${result.error.message}` });
      continue;
    }

    recordCounts[type] = (recordCounts[type] ?? 0) + 1;
  }

  return {
    valid: errors.length === 0,
    errors,
    recordCounts,
    schemaVersion,
  };
}
