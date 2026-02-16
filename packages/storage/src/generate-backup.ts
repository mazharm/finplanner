import type { NdjsonHeader } from '@finplanner/domain';
import { SCHEMA_VERSION } from '@finplanner/domain';
import type { OneDriveFile } from './types.js';

export interface BackupResult {
  content: string;
  warnings: string[];
}

const CANONICAL_ORDER: string[] = [
  'household', 'account', 'incomeStream', 'adjustment',
  'retirementPlan', 'simulationResult',
  'taxYear', 'taxDocument', 'checklistItem', 'anomaly', 'appConfig',
];

const TAX_TYPES = new Set(['taxYear', 'taxDocument', 'checklistItem', 'anomaly']);
const RETIREMENT_TYPES = new Set(['household', 'account', 'incomeStream', 'adjustment', 'retirementPlan', 'simulationResult']);

function isApiKeyField(key: string): boolean {
  const lower = key.toLowerCase();
  return lower.includes('apikey') || lower.includes('api_key') ||
    lower.includes('claudeapikey') || lower.includes('claude_api_key');
}

/** Recursively strip fields that look like API keys from any depth */
function stripApiKeys(value: unknown): unknown {
  if (value === null || value === undefined || typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(stripApiKeys);
  }
  const stripped: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (isApiKeyField(key)) continue;
    stripped[key] = stripApiKeys(val);
  }
  return stripped;
}

export function generateBackup(files: OneDriveFile[]): BackupResult {
  const recordsByType = new Map<string, Array<Record<string, unknown>>>();
  const modules = new Set<'tax' | 'retirement' | 'config'>();
  const seenIds = new Map<string, string>(); // id -> _type for duplicate detection
  const warnings: string[] = [];
  let skippedJsonCount = 0;

  for (const file of files) {
    const lines = file.content.split('\n').filter(l => l.trim().length > 0);
    for (const line of lines) {
      let record: Record<string, unknown>;
      try {
        record = JSON.parse(line);
      } catch {
        skippedJsonCount++;
        continue;
      }

      const type = record._type as string;
      if (!type || type === 'header') continue;

      // Determine module
      if (TAX_TYPES.has(type)) {
        modules.add('tax');
      } else if (RETIREMENT_TYPES.has(type)) {
        modules.add('retirement');
      } else if (type === 'appConfig') {
        modules.add('config');
      }
      // Unknown types still get preserved (no silent data loss)

      // Detect duplicate IDs
      const recordId = record.id as string | undefined;
      if (recordId) {
        const existing = seenIds.get(recordId);
        if (existing) {
          warnings.push(`Duplicate record id "${recordId}" (type: ${type}, previously seen as: ${existing})`);
        } else {
          seenIds.set(recordId, type);
        }
      }

      // Strip API keys recursively from all record types
      const cleanRecord = stripApiKeys(record) as Record<string, unknown>;

      if (!recordsByType.has(type)) {
        recordsByType.set(type, []);
      }
      recordsByType.get(type)!.push(cleanRecord);
    }
  }

  if (skippedJsonCount > 0) {
    warnings.push(`Skipped ${skippedJsonCount} malformed JSON line(s)`);
  }

  // Build header
  const header: NdjsonHeader = {
    _type: 'header',
    schemaVersion: SCHEMA_VERSION,
    savedAt: new Date().toISOString(),
    modules: [...modules].sort() as ('tax' | 'retirement' | 'config')[],
  };

  // Build output: canonical types first, then any unknown types (preserving all data)
  const outputLines: string[] = [JSON.stringify(header)];

  const emittedTypes = new Set<string>();
  for (const type of CANONICAL_ORDER) {
    emittedTypes.add(type);
    const records = recordsByType.get(type) ?? [];
    for (const record of records) {
      outputLines.push(JSON.stringify(record));
    }
  }

  // Emit any remaining types not in CANONICAL_ORDER (prevents silent data loss)
  for (const [type, records] of recordsByType) {
    if (emittedTypes.has(type)) continue;
    warnings.push(`Unknown record type "${type}" preserved in backup (${records.length} record(s))`);
    for (const record of records) {
      outputLines.push(JSON.stringify(record));
    }
  }

  return { content: outputLines.join('\n'), warnings };
}
