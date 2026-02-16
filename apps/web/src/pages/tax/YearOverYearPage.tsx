import { makeStyles, tokens, Card, CardHeader, Text, Title3, Badge } from '@fluentui/react-components';
import { DataTrendingRegular } from '@fluentui/react-icons';
import { useMemo } from 'react';
import { useTaxStore } from '../../stores/tax-store.js';
import type { AnomalySeverity } from '@finplanner/domain';

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: tokens.spacingHorizontalL,
  },
  anomalyCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
  },
});

const severityColors: Record<AnomalySeverity, 'informative' | 'warning' | 'danger'> = {
  info: 'informative',
  warning: 'warning',
  critical: 'danger',
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

export function YearOverYearPage() {
  const styles = useStyles();
  const { taxYears, anomalies } = useTaxStore();

  const sorted = useMemo(() => [...taxYears].sort((a, b) => a.taxYear - b.taxYear), [taxYears]);
  const hasComparison = sorted.length >= 2;

  const comparisons = useMemo(() => {
    if (!hasComparison) return [];
    return sorted.slice(1).map((current, i) => {
      const prior = sorted[i];
      const totalIncomeCurrent = Object.values(current.income).reduce((s, v) => s + v, 0);
      const totalIncomePrior = Object.values(prior.income).reduce((s, v) => s + v, 0);
      const incomeChange = totalIncomePrior !== 0 ? ((totalIncomeCurrent - totalIncomePrior) / totalIncomePrior) * 100 : 0;
      return {
        current: current.taxYear,
        prior: prior.taxYear,
        totalIncomeCurrent,
        totalIncomePrior,
        incomeChange,
        fedTaxCurrent: current.computedFederalTax,
        fedTaxPrior: prior.computedFederalTax,
        effectiveRateCurrent: current.computedEffectiveFederalRate,
        effectiveRatePrior: prior.computedEffectiveFederalRate,
      };
    });
  }, [sorted, hasComparison]);

  const flagCounts = useMemo(() => {
    const counts = { info: 0, warning: 0, critical: 0 };
    for (const a of anomalies) {
      counts[a.severity]++;
    }
    return counts;
  }, [anomalies]);

  return (
    <div className={styles.root}>
      <Title3>
        <DataTrendingRegular /> Year-over-Year Analysis
      </Title3>
      <Text>Compare income, deductions, and tax liability across tax years. Anomalies exceeding the threshold are flagged.</Text>

      {!hasComparison ? (
        <Card>
          <CardHeader header={<Text weight="semibold">Insufficient Data</Text>} />
          <Text>Add at least two tax years to see year-over-year comparisons.</Text>
        </Card>
      ) : (
        <>
          <div className={styles.grid}>
            {comparisons.map((comp) => (
              <Card key={`${comp.prior}-${comp.current}`}>
                <CardHeader header={<Text weight="semibold">{comp.prior} → {comp.current}</Text>} />
                <div className={styles.anomalyCard}>
                  <Text>Income: {formatCurrency(comp.totalIncomePrior)} → {formatCurrency(comp.totalIncomeCurrent)} ({comp.incomeChange >= 0 ? '+' : ''}{comp.incomeChange.toFixed(1)}%)</Text>
                  <Text>Federal Tax: {formatCurrency(comp.fedTaxPrior)} → {formatCurrency(comp.fedTaxCurrent)}</Text>
                  <Text>Effective Rate: {comp.effectiveRatePrior.toFixed(1)}% → {comp.effectiveRateCurrent.toFixed(1)}%</Text>
                </div>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader
              header={<Text weight="semibold">Anomalies ({anomalies.length})</Text>}
              description={
                <span>
                  <Badge appearance="filled" color="informative">{flagCounts.info} info</Badge>{' '}
                  <Badge appearance="filled" color="warning">{flagCounts.warning} warning</Badge>{' '}
                  <Badge appearance="filled" color="danger">{flagCounts.critical} critical</Badge>
                </span>
              }
            />
            {anomalies.length === 0 ? (
              <Text>No anomalies detected across tax years.</Text>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {anomalies.map((a) => (
                  <Card key={a.id} style={{ padding: '8px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <Badge appearance="filled" color={severityColors[a.severity]}>{a.severity}</Badge>
                      <Text weight="semibold">{a.field}</Text>
                      <Text size={200}>({a.comparisonYear} → {a.taxYear})</Text>
                    </div>
                    <Text>{a.description}</Text>
                    {a.percentChange !== undefined && (
                      <Text size={200}>Change: {a.percentChange >= 0 ? '+' : ''}{a.percentChange.toFixed(1)}%</Text>
                    )}
                    <Text size={200} style={{ color: tokens.colorBrandForeground1 }}>
                      Suggested: {a.suggestedAction}
                    </Text>
                  </Card>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
