import {
  makeStyles,
  tokens,
  Tab,
  TabList,
  Button,
  Badge,
  Divider,
  Text,
  MessageBar,
  MessageBarBody,
  MessageBarActions,
} from '@fluentui/react-components';
import {
  HomeRegular,
  PeopleRegular,
  WalletRegular,
  ArrowImportRegular,
  SettingsRegular,
  DocumentRegular,
  CalculatorRegular,
  ClipboardTaskListLtrRegular,
  DataTrendingRegular,
  LightbulbRegular,
  CalendarRegular,
  MoneyRegular,
  SlideSizeRegular,
  PlayRegular,
  ChartMultipleRegular,
  WeatherSunnyRegular,
  WeatherMoonRegular,
  CloudRegular,
  DismissRegular,
  FolderOpenRegular,
} from '@fluentui/react-icons';
import { useNavigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useSettingsStore } from '../stores/settings-store.js';
import { useSharedStore } from '../stores/shared-store.js';
import { useTaxStore } from '../stores/tax-store.js';
import { useRetirementStore } from '../stores/retirement-store.js';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    height: '100vh',
    overflow: 'hidden',
  },
  nav: {
    width: '220px',
    minWidth: '220px',
    backgroundColor: tokens.colorNeutralBackground2,
    borderRight: `1px solid ${tokens.colorNeutralStroke2}`,
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
  },
  navHeader: {
    padding: tokens.spacingVerticalL,
    paddingLeft: tokens.spacingHorizontalL,
  },
  navSection: {
    padding: `${tokens.spacingVerticalXS} 0`,
  },
  sectionLabel: {
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalL}`,
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalL}`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  topBarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
  },
  content: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  main: {
    flex: 1,
    overflow: 'auto',
    padding: tokens.spacingHorizontalXXL,
    backgroundColor: tokens.colorNeutralBackground3,
  },
});

interface AppShellProps {
  children: ReactNode;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

const navItems = [
  { path: '/', label: 'Dashboard', icon: <HomeRegular /> },
  { path: '/customer', label: 'Open Customer', icon: <FolderOpenRegular /> },
  { path: '/household', label: 'Household', icon: <PeopleRegular /> },
  { path: '/accounts', label: 'Accounts', icon: <WalletRegular /> },
  { path: '/import', label: 'Data Import', icon: <ArrowImportRegular /> },
  { path: '/settings', label: 'Settings', icon: <SettingsRegular /> },
];

const taxItems = [
  { path: '/tax', label: 'Tax Years', icon: <CalendarRegular /> },
  { path: '/tax/import', label: 'Document Import', icon: <DocumentRegular /> },
  { path: '/tax/checklist', label: 'Checklist', icon: <ClipboardTaskListLtrRegular /> },
  { path: '/tax/analysis', label: 'YoY Analysis', icon: <DataTrendingRegular /> },
  { path: '/tax/advice', label: 'Tax Advice', icon: <LightbulbRegular /> },
];

const retirementItems = [
  { path: '/retirement/setup', label: 'Plan Setup', icon: <CalculatorRegular /> },
  { path: '/retirement/income', label: 'Income & SS', icon: <MoneyRegular /> },
  { path: '/retirement/assumptions', label: 'Assumptions', icon: <SlideSizeRegular /> },
  { path: '/retirement/scenarios', label: 'Scenarios', icon: <PlayRegular /> },
  { path: '/retirement/results', label: 'Results', icon: <ChartMultipleRegular /> },
  { path: '/retirement/advice', label: 'Advice', icon: <LightbulbRegular /> },
];

export function AppShell({ children, theme, onToggleTheme }: AppShellProps) {
  const styles = useStyles();
  const navigate = useNavigate();
  const location = useLocation();
  const syncStatus = useSettingsStore((s) => s.syncStatus);
  const sharedPersistError = useSharedStore((s) => s.persistError);
  const taxPersistError = useTaxStore((s) => s.persistError);
  const retirementPersistError = useRetirementStore((s) => s.persistError);
  const clearSharedPersistError = useSharedStore((s) => s.clearPersistError);
  const clearTaxPersistError = useTaxStore((s) => s.clearPersistError);
  const clearRetirementPersistError = useRetirementStore((s) => s.clearPersistError);
  const persistError = sharedPersistError || taxPersistError || retirementPersistError;
  const clearPersistError = () => {
    clearSharedPersistError();
    clearTaxPersistError();
    clearRetirementPersistError();
  };

  const currentPath = location.pathname;
  const syncColor = syncStatus === 'synced' ? 'success' : syncStatus === 'error' ? 'danger' : 'informative';
  const syncLabel = syncStatus === 'offline' ? 'Offline' : syncStatus.charAt(0).toUpperCase() + syncStatus.slice(1);

  return (
    <div className={styles.root}>
      <nav className={styles.nav}>
        <div className={styles.navHeader}>
          <Text weight="bold" size={500}>
            FinPlanner
          </Text>
        </div>
        <Divider />
        <div className={styles.navSection}>
          <TabList
            vertical
            selectedValue={currentPath}
            onTabSelect={(_, data) => navigate(data.value as string)}
          >
            {navItems.map((item) => (
              <Tab key={item.path} value={item.path} icon={item.icon}>
                {item.label}
              </Tab>
            ))}
          </TabList>
        </div>
        <Divider />
        <div className={styles.sectionLabel}>Tax Planning</div>
        <div className={styles.navSection}>
          <TabList
            vertical
            selectedValue={currentPath}
            onTabSelect={(_, data) => navigate(data.value as string)}
          >
            {taxItems.map((item) => (
              <Tab key={item.path} value={item.path} icon={item.icon}>
                {item.label}
              </Tab>
            ))}
          </TabList>
        </div>
        <Divider />
        <div className={styles.sectionLabel}>Retirement</div>
        <div className={styles.navSection}>
          <TabList
            vertical
            selectedValue={currentPath}
            onTabSelect={(_, data) => navigate(data.value as string)}
          >
            {retirementItems.map((item) => (
              <Tab key={item.path} value={item.path} icon={item.icon}>
                {item.label}
              </Tab>
            ))}
          </TabList>
        </div>
      </nav>
      <div className={styles.content}>
        <header className={styles.topBar}>
          <Text weight="semibold" size={400}>
            Personal Financial Planning
          </Text>
          <div className={styles.topBarRight}>
            <Badge appearance="outline" color={syncColor} icon={<CloudRegular />}>
              {syncLabel}
            </Badge>
            <Button
              appearance="subtle"
              icon={theme === 'light' ? <WeatherMoonRegular /> : <WeatherSunnyRegular />}
              onClick={onToggleTheme}
              aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
            />
          </div>
        </header>
        {persistError && (
          <MessageBar intent="warning">
            <MessageBarBody>{persistError}</MessageBarBody>
            <MessageBarActions>
              <Button appearance="transparent" icon={<DismissRegular />} onClick={clearPersistError} aria-label="Dismiss" />
            </MessageBarActions>
          </MessageBar>
        )}
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}
