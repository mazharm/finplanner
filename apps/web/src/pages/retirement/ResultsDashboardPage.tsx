import { makeStyles, tokens, Card, CardHeader, Text, Title3, Badge } from '@fluentui/react-components';
import { ChartMultipleRegular } from '@fluentui/react-icons';
import { useRetirementStore } from '../../stores/retirement-store.js';

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: tokens.spacingHorizontalL,
  },
  statValue: { fontSize: tokens.fontSizeBase600, fontWeight: tokens.fontWeightBold },
  statLabel: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
  chartPlaceholder: {
    height: '300px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.colorNeutralBackground4,
    borderRadius: tokens.borderRadiusMedium,
  },
});

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

export function ResultsDashboardPage() {
  const styles = useStyles();
  const { latestResult, scenarios, activeScenarioId } = useRetirementStore();

  const activeScenario = scenarios.find((s) => s.id === activeScenarioId);
  const result = activeScenario?.result ?? latestResult;

  return (
    <div className={styles.root}>
      <Title3>
        <ChartMultipleRegular /> Simulation Results
      </Title3>
      {activeScenario && (
        <Badge appearance="outline">Viewing: {activeScenario.name}</Badge>
      )}
      {!result ? (
        <Card>
          <CardHeader header={<Text weight="semibold">No Results Yet</Text>} />
          <Text>Run a simulation from the Scenarios page to see detailed results here.</Text>
        </Card>
      ) : (
        <>
          <div className={styles.grid}>
            <Card>
              <CardHeader header={<Text weight="semibold">Success Probability</Text>} />
              <div className={styles.statValue}>
                {(result.summary.successProbability * 100).toFixed(0)}%
              </div>
              <div className={styles.statLabel}>
                Percentage of simulations where portfolio lasts through retirement
              </div>
            </Card>
            <Card>
              <CardHeader header={<Text weight="semibold">Median Terminal Value</Text>} />
              <div className={styles.statValue}>
                {formatCurrency(result.summary.medianTerminalValue)}
              </div>
              <div className={styles.statLabel}>50th percentile ending portfolio value</div>
            </Card>
            <Card>
              <CardHeader header={<Text weight="semibold">Worst Case Shortfall</Text>} />
              <div className={styles.statValue}>
                {formatCurrency(result.summary.worstCaseShortfall)}
              </div>
              <div className={styles.statLabel}>5th percentile cumulative spending gap</div>
            </Card>
          </div>
          <Card>
            <CardHeader header={<Text weight="semibold">Portfolio Projection</Text>} />
            <div className={styles.chartPlaceholder}>
              <Text italic>Recharts visualization will be integrated in a future update.</Text>
            </div>
          </Card>
          <Card>
            <CardHeader header={<Text weight="semibold">Year-by-Year Breakdown</Text>} />
            {result.yearResults.length > 0 ? (
              <Text size={200}>
                {result.yearResults.length} years simulated
                ({result.yearResults[0].year}–{result.yearResults[result.yearResults.length - 1].year})
              </Text>
            ) : (
              <Text>No year-by-year data available.</Text>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
