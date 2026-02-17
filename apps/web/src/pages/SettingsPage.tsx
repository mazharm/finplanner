import {
  makeStyles,
  tokens,
  Card,
  CardHeader,
  Text,
  Title3,
  Field,
  Input,
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
} from '@fluentui/react-components';
import { SettingsRegular, KeyRegular, CloudRegular, DeleteRegular, DatabaseRegular } from '@fluentui/react-icons';
import { useState, useCallback, useRef, useEffect } from 'react';
import { useSettingsStore } from '../stores/settings-store.js';
import { loadDemoData } from '../data/demo-data.js';

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL },
  form: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM, maxWidth: '600px' },
  row: { display: 'flex', gap: tokens.spacingHorizontalM, alignItems: 'flex-end' },
  statusRow: { display: 'flex', gap: tokens.spacingHorizontalM, alignItems: 'center' },
  flexField: { flex: 1 },
});

export function SettingsPage() {
  const styles = useStyles();
  const { hasApiKey, syncStatus, setClaudeApiKey, clearClaudeApiKey, clearAllData } = useSettingsStore();
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [saved, setSaved] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [confirmDemo, setConfirmDemo] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoLoaded, setDemoLoaded] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    return () => {
      clearTimeout(savedTimerRef.current);
    };
  }, []);

  const handleSaveKey = useCallback(async () => {
    if (apiKeyInput.trim()) {
      try {
        await setClaudeApiKey(apiKeyInput.trim());
        setApiKeyInput('');
        setSaved(true);
        clearTimeout(savedTimerRef.current);
        savedTimerRef.current = setTimeout(() => setSaved(false), 2000);
      } catch {
        // Error already logged in the store action
      }
    }
  }, [apiKeyInput, setClaudeApiKey]);

  const handleClearKey = useCallback(async () => {
    try {
      await clearClaudeApiKey();
      setSaved(false);
      setConfirmClear(false);
    } catch {
      // Error already logged in the store action
    }
  }, [clearClaudeApiKey]);

  const handleClearAll = useCallback(async () => {
    try {
      await clearAllData();
      setConfirmClearAll(false);
      setSaved(false);
    } catch {
      // Error already logged in the store action
    }
  }, [clearAllData]);

  const handleLoadDemo = useCallback(async () => {
    setDemoLoading(true);
    try {
      await loadDemoData();
      setConfirmDemo(false);
      setDemoLoaded(true);
      clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setDemoLoaded(false), 3000);
    } catch (err) {
      console.error('[FinPlanner] Failed to load demo data:', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setDemoLoading(false);
    }
  }, []);

  return (
    <div className={styles.root}>
      <Title3>
        <SettingsRegular /> Settings
      </Title3>
      {saved && (
        <MessageBar intent="success">
          <MessageBarBody>API key saved to IndexedDB.</MessageBarBody>
        </MessageBar>
      )}
      {demoLoaded && (
        <MessageBar intent="success">
          <MessageBarBody>Demo data loaded successfully. Navigate to any page to see the data.</MessageBarBody>
        </MessageBar>
      )}
      <Card>
        <CardHeader
          header={<Text weight="semibold">Claude API Key</Text>}
          description="Your API key is stored locally in IndexedDB only. It is never sent to any server other than the Anthropic API."
        />
        <div className={styles.form}>
          <div className={styles.statusRow}>
            <Text>Status:</Text>
            <Badge appearance="filled" color={hasApiKey ? 'success' : 'warning'}>
              {hasApiKey ? 'Configured' : 'Not Set'}
            </Badge>
          </div>
          <div className={styles.row}>
            <Field label="API Key" className={styles.flexField}>
              <Input
                type="password"
                placeholder="sk-ant-..."
                value={apiKeyInput}
                onChange={(_, data) => setApiKeyInput(data.value)}
              />
            </Field>
            <Button appearance="primary" icon={<KeyRegular />} onClick={handleSaveKey} disabled={!apiKeyInput.trim()}>
              Save
            </Button>
          </div>
          {hasApiKey && (
            <Button appearance="subtle" icon={<DeleteRegular />} onClick={() => setConfirmClear(true)}>
              Clear API Key
            </Button>
          )}
        </div>
      </Card>
      <Card>
        <CardHeader header={<Text weight="semibold">OneDrive Connection</Text>} />
        <div className={styles.form}>
          <div className={styles.statusRow}>
            <Badge
              appearance="filled"
              color={syncStatus === 'synced' ? 'success' : syncStatus === 'error' ? 'danger' : 'informative'}
              icon={<CloudRegular />}
            >
              {syncStatus === 'offline' ? 'Not Connected' : syncStatus}
            </Badge>
            <Button appearance="primary" disabled>
              Connect OneDrive
            </Button>
            <Text size={200}>(Available in a future update)</Text>
          </div>
        </div>
      </Card>
      <Card>
        <CardHeader header={<Text weight="semibold">About</Text>} />
        <div className={styles.form}>
          <Text>FinPlanner v0.0.1</Text>
          <Text size={200}>
            Integrated tax planning and retirement planning tool.
            All data is stored locally or in your personal OneDrive.
          </Text>
        </div>
      </Card>

      <Card>
        <CardHeader
          header={<Text weight="semibold">Demo Data</Text>}
          description="Load a realistic demo scenario for a fictional retired couple (the Chen family, CA, MFJ). Populates all pages with sample data."
        />
        <div className={styles.form}>
          <Button appearance="primary" icon={<DatabaseRegular />} onClick={() => setConfirmDemo(true)} disabled={demoLoading}>
            {demoLoading ? 'Loading...' : 'Load Demo Data'}
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader header={<Text weight="semibold">Data Management</Text>} />
        <div className={styles.form}>
          <Text size={200}>
            Clear all locally stored data including API key, cached files, tax records, and household information.
          </Text>
          <Button appearance="subtle" icon={<DeleteRegular />} onClick={() => setConfirmClearAll(true)}>
            Clear All Data
          </Button>
        </div>
      </Card>

      <Dialog open={confirmClearAll} onOpenChange={(_, data) => { if (!data.open) setConfirmClearAll(false); }}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Clear All Data</DialogTitle>
            <DialogContent>
              This will permanently delete all locally stored data, including your API key, cached files, tax records, and household information. This cannot be undone.
            </DialogContent>
            <DialogActions>
              <DialogTrigger disableButtonEnhancement>
                <Button appearance="secondary">Cancel</Button>
              </DialogTrigger>
              <Button appearance="primary" onClick={handleClearAll}>
                Clear Everything
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      <Dialog open={confirmDemo} onOpenChange={(_, data) => { if (!data.open && !demoLoading) setConfirmDemo(false); }}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Load Demo Data</DialogTitle>
            <DialogContent>
              This will replace all existing data (household, accounts, tax years, and retirement plans) with demo data for a fictional couple. Any current data will be overwritten.
            </DialogContent>
            <DialogActions>
              <DialogTrigger disableButtonEnhancement>
                <Button appearance="secondary" disabled={demoLoading}>Cancel</Button>
              </DialogTrigger>
              <Button appearance="primary" onClick={handleLoadDemo} disabled={demoLoading}>
                {demoLoading ? 'Loading...' : 'Load Demo Data'}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      <Dialog open={confirmClear} onOpenChange={(_, data) => { if (!data.open) setConfirmClear(false); }}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Clear API Key</DialogTitle>
            <DialogContent>
              Are you sure you want to clear your Claude API key? You will need to re-enter it to use AI-powered features.
            </DialogContent>
            <DialogActions>
              <DialogTrigger disableButtonEnhancement>
                <Button appearance="secondary">Cancel</Button>
              </DialogTrigger>
              <Button appearance="primary" onClick={handleClearKey}>
                Clear
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
}
