import { SCHEMA_VERSION } from '@finplanner/domain';
import { ndjsonHeaderSchema } from '@finplanner/validation';
import type { ImportValidationResult, ImportLineError } from './types.js';
import { getSchemaForType } from './ndjson-schemas.js';

function compareVersions(v1: string, v2: string): number {
  // Strip pre-release suffix (e.g., "3.0.0-beta" -> "3.0.0")
  const clean1 = v1.split('-')[0];
  const clean2 = v2.split('-')[0];
  const parts1 = clean1.split('.').map(Number);
  const parts2 = clean2.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const a = parts1[i] ?? 0;
    const b = parts2[i] ?? 0;
    if (isNaN(a) || isNaN(b)) return -1;
    if (a < b) return -1;
    if (a > b) return 1;
  }
  // Pre-release versions are considered less than their release counterpart
  const hasPreRelease1 = v1.includes('-');
  const hasPreRelease2 = v2.includes('-');
  if (hasPreRelease1 && !hasPreRelease2) return -1;
  if (!hasPreRelease1 && hasPreRelease2) return 1;
  return 0;
}

const MAX_IMPORT_SIZE = 50 * 1024 * 1024; // 50 MB
const MAX_RAW_PREVIEW_LENGTH = 200;
const MAX_LINE_COUNT = 500_000;

export function validateImport(ndjsonContent: string): ImportValidationResult {
  if (ndjsonContent.length > MAX_IMPORT_SIZE) {
    return {
      valid: false,
      errors: [{ line: 0, message: `Import file too large (${(ndjsonContent.length / 1024 / 1024).toFixed(1)} MB, max ${MAX_IMPORT_SIZE / 1024 / 1024} MB)` }],
      recordCounts: {},
    };
  }
  const rawLines = ndjsonContent.split('\n');
  if (rawLines.length > MAX_LINE_COUNT) {
    return {
      valid: false,
      errors: [{ line: 0, message: `Import file has too many lines (${rawLines.length}, max ${MAX_LINE_COUNT})` }],
      recordCounts: {},
    };
  }
  // Build a mapping from filtered index to original line number
  const lineMap: number[] = [];
  const lines: string[] = [];
  for (let i = 0; i < rawLines.length; i++) {
    if (rawLines[i].trim().length > 0) {
      lines.push(rawLines[i]);
      lineMap.push(i + 1); // 1-based original line number
    }
  }
  const errors: ImportLineError[] = [];
  const recordCounts: Record<string, number> = {};
  let schemaVersion: string | undefined;

  if (lines.length === 0) {
    return { valid: false, errors: [{ line: 1, message: 'Empty file' }], recordCounts };
  }

  // Line 1: header
  let header: unknown;
  try {
    header = JSON.parse(lines[0]);
  } catch {
    errors.push({ line: lineMap[0], message: 'Invalid JSON on header line', raw: lines[0].substring(0, MAX_RAW_PREVIEW_LENGTH) });
    return { valid: false, errors, recordCounts };
  }

  const headerResult = ndjsonHeaderSchema.safeParse(header);
  if (!headerResult.success) {
    errors.push({ line: lineMap[0], message: `Invalid header: ${headerResult.error.message}` });
    return { valid: false, errors, recordCounts };
  }

  schemaVersion = headerResult.data.schemaVersion;

  // Version check
  if (compareVersions(schemaVersion, '2.0.0') < 0) {
    errors.push({ line: lineMap[0], message: `Schema version ${schemaVersion} is too old (< 2.0.0)` });
    return { valid: false, errors, recordCounts, schemaVersion };
  }

  // Parse remaining lines
  for (let i = 1; i < lines.length; i++) {
    const lineNum = lineMap[i];
    let record: unknown;
    try {
      record = JSON.parse(lines[i]);
    } catch {
      errors.push({ line: lineNum, message: 'Invalid JSON', raw: lines[i].substring(0, MAX_RAW_PREVIEW_LENGTH) });
      continue;
    }

    if (typeof record !== 'object' || record === null) {
      errors.push({ line: lineNum, message: 'Record is not an object' });
      continue;
    }

    const rec = record as Record<string, unknown>;
    const type = rec._type;
    if (!type || typeof type !== 'string') {
      errors.push({ line: lineNum, message: 'Missing _type field' });
      continue;
    }

    // Skip nested headers (from consolidated files)
    if (type === 'header') continue;

    const schema = getSchemaForType(type as import('@finplanner/domain').NdjsonRecordType);
    if (!schema) {
      // Reject unknown record types to prevent injection of arbitrary unvalidated payloads
      errors.push({ line: lineNum, message: `Unknown record type "${type}". Only known FinPlanner record types are accepted.` });
      continue;
    }

    // Strip _type and __proto__ before validating against the schema
    const { _type, __proto__: _proto, ...data } = rec;
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
