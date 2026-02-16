import type { NdjsonHeader } from '@finplanner/domain';
import { SCHEMA_VERSION } from '@finplanner/domain';
import type { OneDriveFile } from './types.js';

const CANONICAL_ORDER: string[] = [
  'household', 'account', 'incomeStream', 'adjustment',
  'retirementPlan', 'simulationResult',
  'taxYear', 'taxDocument', 'checklistItem', 'anomaly', 'appConfig',
];

function stripApiKeys(record: Record<string, unknown>): Record<string, unknown> {
  const stripped = { ...record };
  // Remove any field that looks like an API key
  for (const key of Object.keys(stripped)) {
    if (key.toLowerCase().includes('apikey') || key.toLowerCase().includes('api_key') ||
        key.toLowerCase().includes('claudeapikey') || key.toLowerCase().includes('claude_api_key')) {
      delete stripped[key];
    }
  }
  return stripped;
}

export function generateBackup(files: OneDriveFile[]): string {
  // Collect all records (excluding headers) from all files
  const recordsByType = new Map<string, Array<Record<string, unknown>>>();
  const modules = new Set<'tax' | 'retirement' | 'config'>();

  for (const file of files) {
    const lines = file.content.split('\n').filter(l => l.trim().length > 0);
    for (const line of lines) {
      let record: Record<string, unknown>;
      try {
        record = JSON.parse(line);
      } catch {
        continue; // skip invalid JSON
      }

      const type = record._type as string;
      if (!type || type === 'header') continue;

      // Determine module
      if (['taxYear', 'taxDocument', 'checklistItem', 'anomaly'].includes(type)) {
        modules.add('tax');
      } else if (['household', 'account', 'incomeStream', 'adjustment', 'retirementPlan', 'simulationResult'].includes(type)) {
        modules.add('retirement');
      } else if (type === 'appConfig') {
        modules.add('config');
      }

      // Strip API keys from appConfig records
      const cleanRecord = type === 'appConfig' ? stripApiKeys(record) : record;

      if (!recordsByType.has(type)) {
        recordsByType.set(type, []);
      }
      recordsByType.get(type)!.push(cleanRecord);
    }
  }

  // Build header
  const header: NdjsonHeader = {
    _type: 'header',
    schemaVersion: SCHEMA_VERSION,
    savedAt: new Date().toISOString(),
    modules: [...modules].sort() as ('tax' | 'retirement' | 'config')[],
  };

  // Build output in canonical order
  const outputLines: string[] = [JSON.stringify(header)];

  for (const type of CANONICAL_ORDER) {
    const records = recordsByType.get(type) ?? [];
    for (const record of records) {
      outputLines.push(JSON.stringify(record));
    }
  }

  return outputLines.join('\n');
}
