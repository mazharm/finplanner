import { makeStyles, tokens, Card, CardHeader, Text, Title3, Badge } from '@fluentui/react-components';
import { HomeRegular } from '@fluentui/react-icons';
import { useSharedStore } from '../stores/shared-store.js';
import { useTaxStore } from '../stores/tax-store.js';
import { useRetirementStore } from '../stores/retirement-store.js';
import { formatCurrency } from '../utils/format.js';
import { useSettingsStore } from '../stores/settings-store.js';
import { Link } from 'react-router-dom';

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: tokens.spacingHorizontalL,
  },
  statValue: { fontSize: tokens.fontSizeBase600, fontWeight: tokens.fontWeightBold },
  statLabel: { color: tokens.colorNeutralForeground3 },
  badgeRow: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    marginBottom: tokens.spacingVerticalXS,
  },
  statusColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
  },
});

export function DashboardPage() {
  const styles = useStyles();
  const household = useSharedStore((s) => s.household);
  const accounts = useSharedStore((s) => s.accounts);
  const incomeStreams = useSharedStore((s) => s.incomeStreams);
  const taxYears = useTaxStore((s) => s.taxYears);
  const latestResult = useRetirementStore((s) => s.latestResult);
  const hasApiKey = useSettingsStore((s) => s.hasApiKey);
  const syncStatus = useSettingsStore((s) => s.syncStatus);

  const totalBalance = accounts.reduce((sum, a) => sum + a.currentBalance, 0);
  const draftTaxYears = taxYears.filter((ty) => ty.status === 'draft').length;
  const filedTaxYears = taxYears.filter((ty) => ty.status === 'filed').length;

  return (
    <div className={styles.root}>
      <Title3>
        <HomeRegular /> Dashboard
      </Title3>
      <div className={styles.grid}>
        <Card>
          <CardHeader header={<Text weight="semibold">Net Worth</Text>} />
          <div className={styles.statValue}>
            {accounts.length > 0 ? formatCurrency(totalBalance) : '—'}
          </div>
          <div className={styles.statLabel}>
            {accounts.length} account{accounts.length !== 1 ? 's' : ''} tracked
          </div>
        </Card>
        <Card>
          <CardHeader header={<Text weight="semibold">Household</Text>} />
          <div className={styles.statValue}>{household.stateOfResidence}</div>
          <div className={styles.statLabel}>
            {household.filingStatus === 'mfj'
              ? 'Married Filing Jointly'
              : household.filingStatus === 'single'
                ? 'Single'
                : 'Survivor'}{' '}
            &middot; Age {household.primary.currentAge}
            {household.spouse ? ` & ${household.spouse.currentAge}` : ''}
          </div>
        </Card>
        <Card>
          <CardHeader header={<Text weight="semibold">Tax Status</Text>} />
          {taxYears.length > 0 ? (
            <>
              <div className={styles.badgeRow}>
                {draftTaxYears > 0 && (
                  <Badge appearance="filled" color="warning">
                    {draftTaxYears} draft
                  </Badge>
                )}
                {filedTaxYears > 0 && (
                  <Badge appearance="filled" color="success">
                    {filedTaxYears} filed
                  </Badge>
                )}
              </div>
              <div className={styles.statLabel}>{taxYears.length} tax year{taxYears.length !== 1 ? 's' : ''}</div>
            </>
          ) : (
            <Text>No tax years configured yet. <Link to="/tax/years">Add a tax year</Link></Text>
          )}
        </Card>
        <Card>
          <CardHeader header={<Text weight="semibold">Retirement Readiness</Text>} />
          {latestResult ? (
            <>
              <div className={styles.statValue}>
                {((latestResult.summary.successProbability ?? 0) * 100).toFixed(0)}%
              </div>
              <div className={styles.statLabel}>
                Success probability &middot; Median {formatCurrency(latestResult.summary.medianTerminalValue ?? 0)}
              </div>
            </>
          ) : (
            <Text>Set up a retirement plan to see projections.</Text>
          )}
        </Card>
        <Card>
          <CardHeader header={<Text weight="semibold">Income Streams</Text>} />
          <div className={styles.statValue}>{incomeStreams.length}</div>
          <div className={styles.statLabel}>
            {incomeStreams.length > 0
              ? formatCurrency(incomeStreams.reduce((sum, s) => sum + s.annualAmount, 0)) + '/yr total'
              : 'No income streams configured'}
          </div>
        </Card>
        <Card>
          <CardHeader header={<Text weight="semibold">System Status</Text>} />
          <div className={styles.statusColumn}>
            <Text>
              Claude API: <Badge appearance="filled" color={hasApiKey ? 'success' : 'warning'}>{hasApiKey ? 'Configured' : 'Not Set'}</Badge>
            </Text>
            <Text>
              OneDrive: <Badge appearance="filled" color={syncStatus === 'synced' ? 'success' : 'informative'}>{syncStatus}</Badge>
            </Text>
          </div>
        </Card>
      </div>
    </div>
  );
}
