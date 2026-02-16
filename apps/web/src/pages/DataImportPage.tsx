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
import { ArrowImportRegular, DocumentRegular } from '@fluentui/react-icons';
import { useState, useCallback, useRef } from 'react';
import { useSharedStore } from '../stores/shared-store.js';
import { useTaxStore } from '../stores/tax-store.js';
import type { HouseholdProfile, Account, IncomeStream, Adjustment, TaxYearRecord, TaxDocument } from '@finplanner/domain';

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
    borderColor: tokens.colorBrandStroke1,
    backgroundColor: tokens.colorBrandBackground2,
  },
  results: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS },
});

interface ImportResult {
  fileName: string;
  recordCount: number;
  types: Record<string, number>;
  errors: string[];
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

  const { setHousehold, addAccount, addIncomeStream, addAdjustment } = useSharedStore();
  const { addTaxYear, addDocument } = useTaxStore();

  const processFile = useCallback(
    async (file: File): Promise<ImportResult> => {
      const text = await file.text();
      const lines = text.split('\n').filter((l) => l.trim().length > 0);
      const result: ImportResult = {
        fileName: file.name,
        recordCount: 0,
        types: {},
        errors: [],
      };

      for (const line of lines) {
        const parsed = parseNdjsonLine(line);
        if (!parsed) {
          result.errors.push(`Invalid JSON line: ${line.slice(0, 60)}...`);
          continue;
        }

        result.recordCount++;
        result.types[parsed.type] = (result.types[parsed.type] ?? 0) + 1;

        try {
          switch (parsed.type) {
            case 'household':
              setHousehold(parsed.data as unknown as HouseholdProfile);
              break;
            case 'account':
              addAccount(parsed.data as unknown as Account);
              break;
            case 'incomeStream':
              addIncomeStream(parsed.data as unknown as IncomeStream);
              break;
            case 'adjustment':
              addAdjustment(parsed.data as unknown as Adjustment);
              break;
            case 'taxYear':
              addTaxYear(parsed.data as unknown as TaxYearRecord);
              break;
            case 'taxDocument':
              addDocument(parsed.data as unknown as TaxDocument);
              break;
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

  const handleFiles = useCallback(
    async (files: FileList) => {
      setImporting(true);
      setProgress(0);
      const importResults: ImportResult[] = [];

      for (let i = 0; i < files.length; i++) {
        const result = await processFile(files[i]);
        importResults.push(result);
        setProgress((i + 1) / files.length);
      }

      setResults(importResults);
      setImporting(false);
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
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
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
            style={{ display: 'none' }}
            onChange={(e) => { if (e.target.files) handleFiles(e.target.files); }}
          />
        </div>
        {importing && <ProgressBar value={progress} />}
      </Card>
      {results.length > 0 && (
        <Card>
          <CardHeader header={<Text weight="semibold">Import Results</Text>} />
          <div className={styles.results}>
            {results.map((r, i) => (
              <div key={i}>
                <Text weight="semibold">{r.fileName}</Text>
                <Text> — {r.recordCount} records imported</Text>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                  {Object.entries(r.types).map(([type, count]) => (
                    <Badge key={type} appearance="outline">{type}: {count}</Badge>
                  ))}
                </div>
                {r.errors.length > 0 && (
                  <MessageBar intent="warning" style={{ marginTop: '4px' }}>
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
