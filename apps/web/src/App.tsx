import { FluentProvider, webLightTheme, webDarkTheme } from '@fluentui/react-components';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary.js';
import { StoreLoadingGate } from './components/StoreLoadingGate.js';
import { AppShell } from './layout/AppShell.js';
import { useSettingsStore } from './stores/settings-store.js';
import { useSharedStore } from './stores/shared-store.js';
import { useTaxStore } from './stores/tax-store.js';
import { useRetirementStore } from './stores/retirement-store.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { HouseholdPage } from './pages/HouseholdPage.js';
import { AccountsPage } from './pages/AccountsPage.js';
import { DataImportPage } from './pages/DataImportPage.js';
import { SettingsPage } from './pages/SettingsPage.js';
import { TaxYearsPage } from './pages/tax/TaxYearsPage.js';
import { TaxYearDetailPage } from './pages/tax/TaxYearDetailPage.js';
import { DocumentImportPage } from './pages/tax/DocumentImportPage.js';
import { TaxChecklistPage } from './pages/tax/TaxChecklistPage.js';
import { YearOverYearPage } from './pages/tax/YearOverYearPage.js';
import { TaxAdvicePage } from './pages/tax/TaxAdvicePage.js';
import { PlanSetupPage } from './pages/retirement/PlanSetupPage.js';
import { IncomeSocialSecurityPage } from './pages/retirement/IncomeSocialSecurityPage.js';
import { AssumptionsPage } from './pages/retirement/AssumptionsPage.js';
import { ScenariosPage } from './pages/retirement/ScenariosPage.js';
import { ResultsDashboardPage } from './pages/retirement/ResultsDashboardPage.js';
import { RetirementAdvicePage } from './pages/retirement/RetirementAdvicePage.js';
import { processSyncQueue } from './services/sync.js';
import { createStubOneDriveClient } from './services/onedrive.js';

const SYNC_INTERVAL_MS = 30_000; // Sync every 30 seconds

export function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const initStarted = useRef(false);

  useEffect(() => {
    // Guard against concurrent initialization (e.g., React Strict Mode double-mount)
    if (initStarted.current) return;
    initStarted.current = true;

    const initStore = async (init: () => Promise<void>, name: string) => {
      try {
        await init();
      } catch (err) {
        console.error(`[FinPlanner] Failed to initialize ${name} store:`, err instanceof Error ? err.message : 'Unknown error');
      }
    };

    Promise.all([
      initStore(() => useSettingsStore.getState().initFromIndexedDB(), 'settings'),
      initStore(() => useSharedStore.getState().initFromIndexedDB(), 'shared'),
      initStore(() => useTaxStore.getState().initFromIndexedDB(), 'tax'),
      initStore(() => useRetirementStore.getState().initFromIndexedDB(), 'retirement'),
    ]).catch((err) => {
      console.error('[FinPlanner] Store initialization failed:', err instanceof Error ? err.message : 'Unknown error');
    });
  }, []);

  // OneDrive sync loop: process queued writes periodically when connected
  const oneDriveConnected = useSettingsStore((s) => s.oneDriveConnected);
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const runSync = useCallback(async () => {
    const { setSyncStatus } = useSettingsStore.getState();
    try {
      setSyncStatus('syncing');
      const client = createStubOneDriveClient(); // In production: use real MSAL client singleton
      const result = await processSyncQueue(client);
      setSyncStatus(result.status);
    } catch (err) {
      console.error('[FinPlanner] Sync loop error:', err instanceof Error ? err.message : 'Unknown error');
      setSyncStatus('error');
    }
  }, []);

  useEffect(() => {
    if (oneDriveConnected) {
      // Run immediately, then on interval
      runSync();
      syncIntervalRef.current = setInterval(runSync, SYNC_INTERVAL_MS);
    } else {
      useSettingsStore.getState().setSyncStatus('offline');
    }
    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    };
  }, [oneDriveConnected, runSync]);

  const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'));

  return (
    <FluentProvider theme={theme === 'light' ? webLightTheme : webDarkTheme}>
      <ErrorBoundary>
      <StoreLoadingGate>
      <BrowserRouter>
        <AppShell theme={theme} onToggleTheme={toggleTheme}>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/household" element={<HouseholdPage />} />
            <Route path="/accounts" element={<AccountsPage />} />
            <Route path="/import" element={<DataImportPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/tax" element={<TaxYearsPage />} />
            <Route path="/tax/:year" element={<TaxYearDetailPage />} />
            <Route path="/tax/import" element={<DocumentImportPage />} />
            <Route path="/tax/checklist" element={<TaxChecklistPage />} />
            <Route path="/tax/analysis" element={<YearOverYearPage />} />
            <Route path="/tax/advice" element={<TaxAdvicePage />} />
            <Route path="/retirement/setup" element={<PlanSetupPage />} />
            <Route path="/retirement/income" element={<IncomeSocialSecurityPage />} />
            <Route path="/retirement/assumptions" element={<AssumptionsPage />} />
            <Route path="/retirement/scenarios" element={<ScenariosPage />} />
            <Route path="/retirement/results" element={<ResultsDashboardPage />} />
            <Route path="/retirement/advice" element={<RetirementAdvicePage />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </AppShell>
      </BrowserRouter>
      </StoreLoadingGate>
      </ErrorBoundary>
    </FluentProvider>
  );
}
