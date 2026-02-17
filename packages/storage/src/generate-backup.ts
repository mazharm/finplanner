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
const SINGLETON_TYPES = new Set(['household', 'appConfig']);
const TAX_YEAR_KEYED_TYPES = new Set(['taxYear']);

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
  const seenIds = new Map<string, { type: string; index: number }>(); // id -> type and index for dedup
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

      // Compute a dedup key based on record type:
      // - Singleton types (household, appConfig): keyed by _type alone
      // - taxYear records: keyed by _type + taxYear
      // - All other records: keyed by id field
      let dedupKey: string | undefined;
      if (SINGLETON_TYPES.has(type)) {
        dedupKey = `singleton:${type}`;
      } else if (TAX_YEAR_KEYED_TYPES.has(type) && record.taxYear != null) {
        dedupKey = `${type}:taxYear:${record.taxYear}`;
      } else {
        const recordId = record.id as string | undefined;
        if (recordId) {
          dedupKey = `id:${recordId}`;
        }
      }

      if (dedupKey) {
        const existing = seenIds.get(dedupKey);
        if (existing) {
          warnings.push(`Duplicate ${type} record (key: "${dedupKey}", previously seen as: ${existing.type}) — keeping last occurrence`);
          // Remove the previously stored record
          const prevRecords = recordsByType.get(existing.type);
          if (prevRecords) {
            const idx = prevRecords.findIndex((r) => {
              if (SINGLETON_TYPES.has(existing.type)) return r._type === existing.type;
              if (TAX_YEAR_KEYED_TYPES.has(existing.type)) return r.taxYear === record.taxYear;
              return r.id === record.id;
            });
            if (idx !== -1) {
              prevRecords.splice(idx, 1);
            }
          }
        }
        seenIds.set(dedupKey, { type, index: (recordsByType.get(type)?.length ?? 0) });
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

  return { content: outputLines.join('\n') + '\n', warnings };
}
