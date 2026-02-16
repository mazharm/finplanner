import { FluentProvider, webLightTheme, webDarkTheme } from '@fluentui/react-components';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary.js';
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

export function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    useSettingsStore.getState().initFromIndexedDB();
    useSharedStore.getState().initFromIndexedDB();
    useTaxStore.getState().initFromIndexedDB();
    useRetirementStore.getState().initFromIndexedDB();
  }, []);

  const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'));

  return (
    <FluentProvider theme={theme === 'light' ? webLightTheme : webDarkTheme}>
      <ErrorBoundary>
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
          </Routes>
        </AppShell>
      </BrowserRouter>
      </ErrorBoundary>
    </FluentProvider>
  );
}
