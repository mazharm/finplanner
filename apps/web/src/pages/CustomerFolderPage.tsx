import {
  makeStyles,
  tokens,
  Card,
  CardHeader,
  Text,
  Title3,
  Button,
  Badge,
  MessageBar,
  MessageBarBody,
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogTrigger,
  Spinner,
} from '@fluentui/react-components';
import { FolderOpenRegular, CloudRegular } from '@fluentui/react-icons';
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { LocalFolderReader } from '../services/folder-reader.js';
import { hydrateFromFolder, type HydrationResult } from '../services/hydrate-folder.js';
import { useSharedStore } from '../stores/shared-store.js';
import { useTaxStore } from '../stores/tax-store.js';

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL },
  form: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM, maxWidth: '600px' },
  statusRow: { display: 'flex', gap: tokens.spacingHorizontalM, alignItems: 'center' },
  badgeRow: {
    display: 'flex',
    gap: tokens.spacingHorizontalXS,
    flexWrap: 'wrap',
    marginTop: tokens.spacingVerticalXS,
  },
  results: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS },
});

const supportsDirectoryPicker = typeof window !== 'undefined' && 'showDirectoryPicker' in window;

export function CustomerFolderPage() {
  const styles = useStyles();
  const navigate = useNavigate();
  const accountCount = useSharedStore((s) => s.accounts.length);
  const taxYearCount = useTaxStore((s) => s.taxYears.length);
  const incomeStreamCount = useSharedStore((s) => s.incomeStreams.length);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<HydrationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dirHandle, setDirHandle] = useState<FileSystemDirectoryHandle | null>(null);

  const handlePickFolder = useCallback(async () => {
    try {
      const handle = await window.showDirectoryPicker({ mode: 'read' });
      setDirHandle(handle);
      setConfirmOpen(true);
    } catch (err) {
      // User cancelled the picker — not an error
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(`Failed to open folder: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, []);

  const handleConfirmLoad = useCallback(async () => {
    if (!dirHandle) return;
    setConfirmOpen(false);
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const reader = new LocalFolderReader(dirHandle);
      const hydrationResult = await hydrateFromFolder(reader);
      setResult(hydrationResult);
    } catch (err) {
      setError(`Hydration failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
      setDirHandle(null);
    }
  }, [dirHandle]);

  const totalRecords = result
    ? Object.values(result.recordCounts).reduce((sum, n) => sum + n, 0)
    : 0;

  return (
    <div className={styles.root}>
      <Title3>
        <FolderOpenRegular /> Open Customer Folder
      </Title3>

      {error && (
        <MessageBar intent="error">
          <MessageBarBody>{error}</MessageBarBody>
        </MessageBar>
      )}

      {result && result.errors.length === 0 && totalRecords > 0 && (
        <MessageBar intent="success">
          <MessageBarBody>
            Loaded {totalRecords} records successfully.{' '}
            <Button appearance="transparent" size="small" onClick={() => navigate('/')}>
              Go to Dashboard
            </Button>
          </MessageBarBody>
        </MessageBar>
      )}

      <Card>
        <CardHeader
          header={<Text weight="semibold">Open Local Folder</Text>}
          description="Select a folder containing FinPlanner data files (NDJSON). All existing data will be replaced."
        />
        <div className={styles.form}>
          {supportsDirectoryPicker ? (
            <Button
              appearance="primary"
              icon={loading ? <Spinner size="tiny" /> : <FolderOpenRegular />}
              onClick={handlePickFolder}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Choose Folder'}
            </Button>
          ) : (
            <div>
              <MessageBar intent="warning">
                <MessageBarBody>
                  Your browser does not support the File System Access API (directory picker).
                  Please use a Chromium-based browser (Chrome, Edge), or use the{' '}
                  <Button appearance="transparent" size="small" onClick={() => navigate('/import')}>
                    Data Import
                  </Button>{' '}
                  page to import individual NDJSON files.
                </MessageBarBody>
              </MessageBar>
            </div>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader header={<Text weight="semibold">Open from OneDrive</Text>} />
        <div className={styles.form}>
          <div className={styles.statusRow}>
            <Button appearance="primary" icon={<CloudRegular />} disabled>
              Connect OneDrive
            </Button>
            <Text size={200}>(Available in a future update)</Text>
          </div>
        </div>
      </Card>

      {result && (
        <Card>
          <CardHeader header={<Text weight="semibold">Load Results</Text>} />
          <div className={styles.results}>
            <Text>Records loaded by type:</Text>
            <div className={styles.badgeRow}>
              {Object.entries(result.recordCounts).map(([type, count]) => (
                <Badge key={type} appearance="outline">
                  {type}: {count}
                </Badge>
              ))}
            </div>
            {totalRecords === 0 && (
              <MessageBar intent="warning">
                <MessageBarBody>
                  No records were found. Make sure the folder follows the FinPlanner directory layout
                  (shared/corpus.ndjson, tax/YYYY/record.ndjson, etc.).
                </MessageBarBody>
              </MessageBar>
            )}
            {result.warnings.length > 0 && (
              <MessageBar intent="warning">
                <MessageBarBody>
                  {result.warnings.length} warning(s): {result.warnings.slice(0, 5).join('; ')}
                  {result.warnings.length > 5 && ` ... and ${result.warnings.length - 5} more`}
                </MessageBarBody>
              </MessageBar>
            )}
            {result.errors.length > 0 && (
              <MessageBar intent="error">
                <MessageBarBody>
                  {result.errors.length} error(s): {result.errors.join('; ')}
                </MessageBarBody>
              </MessageBar>
            )}
          </div>
        </Card>
      )}

      <Dialog open={confirmOpen} onOpenChange={(_, data) => { if (!data.open) { setConfirmOpen(false); setDirHandle(null); } }}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Load Customer Data</DialogTitle>
            <DialogContent>
              <Text>This will replace all existing data with data from the selected folder.</Text>
              {(accountCount > 0 || taxYearCount > 0 || incomeStreamCount > 0) && (
                <MessageBar intent="warning" style={{ marginTop: '8px' }}>
                  <MessageBarBody>
                    Current data that will be overwritten: {accountCount} account(s), {taxYearCount} tax year(s), {incomeStreamCount} income stream(s).
                  </MessageBarBody>
                </MessageBar>
              )}
            </DialogContent>
            <DialogActions>
              <DialogTrigger disableButtonEnhancement>
                <Button appearance="secondary">Cancel</Button>
              </DialogTrigger>
              <Button appearance="primary" onClick={handleConfirmLoad}>
                Load Data
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
}
