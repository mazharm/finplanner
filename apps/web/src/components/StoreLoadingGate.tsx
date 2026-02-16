import { Spinner, makeStyles, tokens } from '@fluentui/react-components';
import { useSettingsStore } from '../stores/settings-store.js';
import { useSharedStore } from '../stores/shared-store.js';
import type { ReactNode } from 'react';

const useStyles = makeStyles({
  loading: {
    display: 'flex',
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

  if (!settingsReady || !sharedReady) {
    return (
      <div className={styles.loading}>
        <Spinner size="medium" label="Loading..." />
      </div>
    );
  }

  return <>{children}</>;
}
