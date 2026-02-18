import {
  makeStyles,
  tokens,
  Card,
  CardHeader,
  Text,
  Title3,
  Button,
  MessageBar,
  MessageBarBody,
  ProgressBar,
  Badge,
} from '@fluentui/react-components';
import { ArrowImportRegular, DocumentRegular, ArrowExportRegular } from '@fluentui/react-icons';
import { useState, useCallback, useRef, useEffect } from 'react';
import { useSharedStore } from '../stores/shared-store.js';
import { useTaxStore } from '../stores/tax-store.js';
import {
  householdProfileSchema,
  accountSchema,
  incomeStreamSchema,
  adjustmentSchema,
  taxYearRecordSchema,
  taxDocumentSchema,
} from '@finplanner/validation';
import { generateBackup } from '@finplanner/storage';
import type { OneDriveFile } from '@finplanner/storage';

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL },
  dropZone: {
    border: `2px dashed ${tokens.colorNeutralStroke1}`,
    borderRadius: tokens.borderRadiusMedium,
    padding: tokens.spacingVerticalXXL,
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: tokens.spacingVerticalM,
    cursor: 'pointer',
  },
  dropZoneActive: {
    border: `2px dashed ${tokens.colorBrandStroke1}`,
    backgroundColor: tokens.colorBrandBackground2,
  },
  results: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS },
  exportMessage: { marginTop: tokens.spacingVerticalS },
  badgeRow: {
    display: 'flex',
    gap: tokens.spacingHorizontalXS,
    flexWrap: 'wrap',
    marginTop: tokens.spacingVerticalXS,
  },
  importWarning: { marginTop: tokens.spacingVerticalXS },
});

interface ImportResult {
  fileName: string;
  recordCount: number;
  types: Record<string, number>;
  errors: string[];
  duplicatesSkipped: number;
}

function parseNdjsonLine(line: string): { type: string; data: Record<string, unknown> } | null {
  try {
    const parsed = JSON.parse(line);
    return { type: parsed._type ?? 'unknown', data: parsed };
  } catch {
    return null;
  }
}

export function DataImportPage() {
  const styles = useStyles();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [exportMsg, setExportMsg] = useState<string | null>(null);

  // Auto-dismiss export success message after 5 seconds
  useEffect(() => {
    if (!exportMsg) return;
    const timer = setTimeout(() => setExportMsg(null), 5000);
    return () => clearTimeout(timer);
  }, [exportMsg]);

  const { setHousehold, addAccount, addIncomeStream, addAdjustment } = useSharedStore();
  const { addTaxYear, addDocument } = useTaxStore();

  const handleExport = useCallback(() => {
    const sharedState = useSharedStore.getState();
    const taxState = useTaxStore.getState();

    // Build NDJSON lines from current state
    const lines: string[] = [];
    if (sharedState.household) {
      lines.push(JSON.stringify({ _type: 'household', ...sharedState.household }));
    }
    for (const acct of sharedState.accounts) {
      lines.push(JSON.stringify({ _type: 'account', ...acct }));
    }
    for (const stream of sharedState.incomeStreams) {
      lines.push(JSON.stringify({ _type: 'incomeStream', ...stream }));
    }
    for (const adj of sharedState.adjustments) {
      lines.push(JSON.stringify({ _type: 'adjustment', ...adj }));
    }
    for (const ty of taxState.taxYears) {
      lines.push(JSON.stringify({ _type: 'taxYear', ...ty }));
    }
    for (const doc of taxState.documents) {
      lines.push(JSON.stringify({ _type: 'taxDocument', ...doc }));
    }

    const file: OneDriveFile = { name: 'state.ndjson', content: lines.join('\n') };
    const { content } = generateBackup([file]);

    const blob = new Blob([content], { type: 'application/x-ndjson' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finplanner-backup-${new Date().toISOString().slice(0, 10)}.ndjson`;
    a.click();
    URL.revokeObjectURL(url);
    setExportMsg('Backup exported successfully.');
  }, []);

  const processFile = useCallback(
    async (file: File): Promise<ImportResult> => {
      const text = await file.text();
      const lines = text.split('\n').filter((l) => l.trim().length > 0);
      const result: ImportResult = {
        fileName: file.name,
        recordCount: 0,
        types: {},
        errors: [],
        duplicatesSkipped: 0,
      };

      for (const line of lines) {
        const parsed = parseNdjsonLine(line);
        if (!parsed) {
          result.errors.push(`Invalid JSON line: ${line.slice(0, 60)}...`);
          continue;
        }

        // Don't count headers as imported records — they're metadata
        if (parsed.type !== 'header') {
          result.recordCount++;
        }
        result.types[parsed.type] = (result.types[parsed.type] ?? 0) + 1;

        try {
          const { _type, ...data } = parsed.data;
          switch (parsed.type) {
            case 'household': {
              const validated = householdProfileSchema.safeParse(data);
              if (!validated.success) { result.errors.push(`Invalid household: ${validated.error.message}`); break; }
              setHousehold(validated.data);
              break;
            }
            case 'account': {
              const validated = accountSchema.safeParse(data);
              if (!validated.success) { result.errors.push(`Invalid account: ${validated.error.message}`); break; }
              // Read fresh store state to avoid stale duplicate detection
              if (useSharedStore.getState().accounts.some((a) => a.id === validated.data.id)) {
                result.duplicatesSkipped++;
                break;
              }
              addAccount(validated.data);
              break;
            }
            case 'incomeStream': {
              const validated = incomeStreamSchema.safeParse(data);
              if (!validated.success) { result.errors.push(`Invalid incomeStream: ${validated.error.message}`); break; }
              if (useSharedStore.getState().incomeStreams.some((s) => s.id === validated.data.id)) {
                result.duplicatesSkipped++;
                break;
              }
              addIncomeStream(validated.data);
              break;
            }
            case 'adjustment': {
              const validated = adjustmentSchema.safeParse(data);
              if (!validated.success) { result.errors.push(`Invalid adjustment: ${validated.error.message}`); break; }
              if (useSharedStore.getState().adjustments.some((a) => a.id === validated.data.id)) {
                result.duplicatesSkipped++;
                break;
              }
              addAdjustment(validated.data);
              break;
            }
            case 'taxYear': {
              const validated = taxYearRecordSchema.safeParse(data);
              if (!validated.success) { result.errors.push(`Invalid taxYear: ${validated.error.message}`); break; }
              if (useTaxStore.getState().taxYears.some((ty) => ty.taxYear === validated.data.taxYear)) {
                result.duplicatesSkipped++;
                break;
              }
              addTaxYear(validated.data);
              break;
            }
            case 'taxDocument': {
              const validated = taxDocumentSchema.safeParse(data);
              if (!validated.success) { result.errors.push(`Invalid taxDocument: ${validated.error.message}`); break; }
              if (useTaxStore.getState().documents.some((d) => d.id === validated.data.id)) {
                result.duplicatesSkipped++;
                break;
              }
              addDocument(validated.data);
              break;
            }
            case 'header':
              break;
            default:
              break;
          }
        } catch (err) {
          result.errors.push(`Error processing ${parsed.type}: ${String(err)}`);
        }
      }

      return result;
    },
    [setHousehold, addAccount, addIncomeStream, addAdjustment, addTaxYear, addDocument],
  );

  const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
  const MAX_FILE_COUNT = 20;

  const handleFiles = useCallback(
    async (files: FileList) => {
      if (files.length > MAX_FILE_COUNT) {
        setResults([{
          fileName: `(${files.length} files selected)`,
          recordCount: 0,
          types: {},
          errors: [`Too many files selected. Maximum is ${MAX_FILE_COUNT} files per import.`],
          duplicatesSkipped: 0,
        }]);
        return;
      }
      setImporting(true);
      setProgress(0);
      const importResults: ImportResult[] = [];

      for (let i = 0; i < files.length; i++) {
        if (files[i].size > MAX_FILE_SIZE_BYTES) {
          importResults.push({
            fileName: files[i].name,
            recordCount: 0,
            types: {},
            errors: [`File exceeds maximum size of 50 MB (${(files[i].size / 1024 / 1024).toFixed(1)} MB)`],
            duplicatesSkipped: 0,
          });
          setProgress((i + 1) / files.length);
          continue;
        }
        const result = await processFile(files[i]);
        importResults.push(result);
        setProgress((i + 1) / files.length);
      }

      setResults(importResults);
      setImporting(false);
      // Reset file input so re-selecting the same file triggers onChange
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [processFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles],
  );

  return (
    <div className={styles.root}>
      <Title3>
        <ArrowImportRegular /> Data Import
      </Title3>
      <Card>
        <CardHeader
          header={<Text weight="semibold">Import NDJSON Backup</Text>}
          description="Upload .ndjson files to restore household, accounts, tax years, and documents."
        />
        <div
          className={`${styles.dropZone} ${dragActive ? styles.dropZoneActive : ''}`}
          role="button"
          tabIndex={0}
          aria-label="Drop zone for NDJSON backup files. Click or drag and drop files here."
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click(); } }}
        >
          <DocumentRegular fontSize={48} />
          <Text>{dragActive ? 'Drop files here...' : 'Drag and drop NDJSON files here, or click to browse.'}</Text>
          <Button appearance="primary" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
            Browse Files
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".ndjson,.jsonl"
            multiple
            aria-label="Upload NDJSON backup files"
            style={{ display: 'none' }}
            onChange={(e) => { if (e.target.files) handleFiles(e.target.files); }}
          />
        </div>
        {importing && <ProgressBar value={progress} />}
        {importing && <Text size={200}>Importing files... Do not close this page.</Text>}
      </Card>
      <Card>
        <CardHeader
          header={<Text weight="semibold">Export NDJSON Backup</Text>}
          description="Download all current data as an NDJSON backup file."
        />
        <Button appearance="secondary" icon={<ArrowExportRegular />} onClick={handleExport}>
          Export Backup
        </Button>
        {exportMsg && (
          <MessageBar intent="success" className={styles.exportMessage}>
            <MessageBarBody>{exportMsg}</MessageBarBody>
          </MessageBar>
        )}
      </Card>
      {results.length > 0 && (
        <Card>
          <CardHeader header={<Text weight="semibold">Import Results</Text>} />
          {results.every(r => r.errors.length === 0) && results.some(r => r.recordCount > 0) && (
            <MessageBar intent="success">
              <MessageBarBody>Import completed successfully.</MessageBarBody>
            </MessageBar>
          )}
          <div className={styles.results}>
            {results.map((r, i) => (
              <div key={i}>
                <Text weight="semibold">{r.fileName}</Text>
                <Text> — {r.recordCount - r.duplicatesSkipped} records imported</Text>
                {r.duplicatesSkipped > 0 && (
                  <Text> ({r.duplicatesSkipped} duplicate(s) skipped)</Text>
                )}
                <div className={styles.badgeRow}>
                  {Object.entries(r.types).map(([type, count]) => (
                    <Badge key={type} appearance="outline">{type}: {count}</Badge>
                  ))}
                </div>
                {r.duplicatesSkipped > 0 && (
                  <MessageBar intent="info" className={styles.importWarning}>
                    <MessageBarBody>{r.duplicatesSkipped} duplicate record(s) were skipped to avoid overwriting existing data.</MessageBarBody>
                  </MessageBar>
                )}
                {r.errors.length > 0 && (
                  <MessageBar intent="warning" className={styles.importWarning}>
                    <MessageBarBody>{r.errors.length} error(s) during import</MessageBarBody>
                  </MessageBar>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
