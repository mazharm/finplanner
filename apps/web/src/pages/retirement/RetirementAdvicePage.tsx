import {
  makeStyles,
  tokens,
  Card,
  CardHeader,
  Text,
  Title3,
  Badge,
  Button,
  Spinner,
  MessageBar,
  MessageBarBody,
} from '@fluentui/react-components';
import { LightbulbRegular } from '@fluentui/react-icons';
import { useState, useCallback } from 'react';
import { useSharedStore } from '../../stores/shared-store.js';
import { useRetirementStore } from '../../stores/retirement-store.js';
import { useSettingsStore } from '../../stores/settings-store.js';

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL },
  adviceList: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM },
  recommendation: {
    padding: tokens.spacingVerticalM,
    borderLeft: `3px solid ${tokens.colorBrandStroke1}`,
    paddingLeft: tokens.spacingHorizontalL,
  },
});

interface Recommendation {
  title: string;
  description: string;
  source: 'llm' | 'fallback';
}

export function RetirementAdvicePage() {
  const styles = useStyles();
  const { accounts } = useSharedStore();
  const { spending, latestResult } = useRetirementStore();
  const { hasApiKey } = useSettingsStore();
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [disclaimer, setDisclaimer] = useState('');

  const handleGetAdvice = useCallback(async () => {
    setLoading(true);

    // Simulate getting advice — in production this calls getPortfolioAdvice()
    await new Promise((r) => setTimeout(r, 500));

    const recs: Recommendation[] = [];
    const totalBalance = accounts.reduce((sum, a) => sum + a.currentBalance, 0);

    if (latestResult && latestResult.summary.worstCaseShortfall > 0) {
      recs.push({
        title: 'Shortfall Risk',
        description: 'Consider reducing spending target or delaying retirement to address potential shortfall.',
        source: 'fallback',
      });
    }

    if (totalBalance > 0 && totalBalance * 0.04 < (spending.floorAnnualSpend ?? spending.targetAnnualSpend)) {
      recs.push({
        title: '4% Rule Warning',
        description: 'Current savings may not support desired spending at a 4% withdrawal rate.',
        source: 'fallback',
      });
    }

    const hasTaxDeferred = accounts.some((a) => a.type === 'taxDeferred');
    const hasRoth = accounts.some((a) => a.type === 'roth');
    if (hasTaxDeferred && hasRoth) {
      recs.push({
        title: 'Tax-Optimized Withdrawal',
        description: 'Consider tax-optimized withdrawal ordering (taxable → tax-deferred → Roth) to minimize lifetime taxes.',
        source: 'fallback',
      });
    }

    recs.push({
      title: 'Stress Scenarios',
      description: 'Review historical stress scenarios to understand downside risk.',
      source: 'fallback',
    });

    setRecommendations(recs);
    setDisclaimer('This is rule-based guidance, not personalized financial advice. Consult a qualified financial advisor.');
    setLoading(false);
  }, [accounts, spending, latestResult]);

  return (
    <div className={styles.root}>
      <Title3>
        <LightbulbRegular /> Retirement Advice
      </Title3>
      <MessageBar intent="info">
        <MessageBarBody>
          Retirement advice is generated using {hasApiKey ? 'Claude AI' : 'rule-based analysis (fallback mode)'}. No personally identifiable information is sent to the API.
        </MessageBarBody>
      </MessageBar>
      <Card>
        <CardHeader
          header={<Text weight="semibold">Get Retirement Advice</Text>}
          description="Configure your plan and run a simulation first for best results."
        />
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Button appearance="primary" onClick={handleGetAdvice} disabled={loading}>
            {loading ? <Spinner size="tiny" /> : 'Get Retirement Advice'}
          </Button>
          <Badge appearance="outline">
            {hasApiKey ? 'AI mode' : 'Fallback mode'}
          </Badge>
        </div>
      </Card>
      {recommendations.length > 0 && (
        <Card>
          <CardHeader header={<Text weight="semibold">Recommendations</Text>} />
          <div className={styles.adviceList}>
            {recommendations.map((rec, i) => (
              <div key={i} className={styles.recommendation}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                  <Text weight="semibold">{rec.title}</Text>
                  <Badge appearance="outline" size="small">{rec.source}</Badge>
                </div>
                <Text>{rec.description}</Text>
              </div>
            ))}
          </div>
          {disclaimer && (
            <MessageBar intent="warning" style={{ marginTop: '12px' }}>
              <MessageBarBody>{disclaimer}</MessageBarBody>
            </MessageBar>
          )}
        </Card>
      )}
    </div>
  );
}
