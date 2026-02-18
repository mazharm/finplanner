import { Spinner, MessageBar, MessageBarBody, Button, makeStyles, tokens } from '@fluentui/react-components';
import { useSettingsStore } from '../stores/settings-store.js';
import { useSharedStore } from '../stores/shared-store.js';
import { useTaxStore } from '../stores/tax-store.js';
import { useRetirementStore } from '../stores/retirement-store.js';
import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';

const LOADING_TIMEOUT_MS = 10_000;

const useStyles = makeStyles({
  loading: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    gap: tokens.spacingHorizontalM,
  },
});

export function StoreLoadingGate({ children }: { children: ReactNode }) {
  const styles = useStyles();
  const settingsReady = useSettingsStore((s) => s.initialized);
  const sharedReady = useSharedStore((s) => s.initialized);
  const taxReady = useTaxStore((s) => s.initialized);
  const retirementReady = useRetirementStore((s) => s.initialized);
  const [timedOut, setTimedOut] = useState(false);

  const allReady = settingsReady && sharedReady && taxReady && retirementReady;

  useEffect(() => {
    if (allReady) return;
    const timer = setTimeout(() => setTimedOut(true), LOADING_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [allReady]);

  if (!allReady) {
    if (timedOut) {
      return (
        <div className={styles.loading}>
          <MessageBar intent="warning">
            <MessageBarBody>Loading is taking longer than expected. Try refreshing the page.</MessageBarBody>
          </MessageBar>
          <Button appearance="primary" onClick={() => window.location.reload()}>
            Reload Page
          </Button>
        </div>
      );
    }
    return (
      <div className={styles.loading}>
        <Spinner size="medium" label="Loading..." />
      </div>
    );
  }

  return <>{children}</>;
}
