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
import { useState, useCallback, useEffect, useRef } from 'react';
import { getPortfolioAdvice } from '@finplanner/claude';
import type { PortfolioAdviceRequest } from '@finplanner/domain';
import { useSharedStore } from '../../stores/shared-store.js';
import { useRetirementStore } from '../../stores/retirement-store.js';
import { useSettingsStore } from '../../stores/settings-store.js';
import { createLlmClient } from '../../services/llm-client.js';
import { getApiKey } from '../../services/indexeddb.js';

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL },
  adviceList: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM },
  recommendation: {
    padding: tokens.spacingVerticalM,
    borderLeft: `3px solid ${tokens.colorBrandStroke1}`,
    paddingLeft: tokens.spacingHorizontalL,
  },
  actionRow: { display: 'flex', gap: tokens.spacingHorizontalL, alignItems: 'center' },
  recHeader: { display: 'flex', gap: tokens.spacingHorizontalS, alignItems: 'center', marginBottom: tokens.spacingVerticalXS },
  disclaimerBar: { marginTop: tokens.spacingVerticalL },
});

interface Recommendation {
  title: string;
  description: string;
  source: 'llm' | 'fallback';
}

export function RetirementAdvicePage() {
  const styles = useStyles();
  const { household, accounts, incomeStreams } = useSharedStore();
  const { spending, taxes, market, strategy, latestResult } = useRetirementStore();
  const { hasApiKey } = useSettingsStore();
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [disclaimer, setDisclaimer] = useState('');
  const [error, setError] = useState('');

  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const handleGetAdvice = useCallback(async () => {
    // Abort any in-flight request
    abortControllerRef.current?.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setLoading(true);
    setError('');

    try {
      const apiKey = await getApiKey();

      if (abortController.signal.aborted) return;

      const client = apiKey ? createLlmClient(apiKey, undefined, abortController.signal) : undefined;

      const request: PortfolioAdviceRequest = {
        planInput: {
          household,
          accounts,
          otherIncome: incomeStreams,
          adjustments: [],
          spending,
          taxes,
          market,
          strategy,
        },
        planResultSummary: latestResult?.summary ?? {
          successProbability: 0,
          medianTerminalValue: 0,
          worstCaseShortfall: 0,
          medianShortfallYear: null,
          percentile10: 0,
          percentile25: 0,
          percentile50: 0,
          percentile75: 0,
          percentile90: 0,
        },
        userPreferences: {
          riskTolerance: 'moderate',
          spendingFloor: spending.floorAnnualSpend ?? spending.targetAnnualSpend * 0.8,
          legacyGoal: 0,
        },
      };

      const response = await getPortfolioAdvice(request, client);

      if (abortController.signal.aborted) return;

      const recs: Recommendation[] = response.recommendations.map((r) => ({
        title: r.title,
        description: r.rationale,
        source: r.source,
      }));

      setRecommendations(recs);
      setDisclaimer(response.disclaimer);
    } catch (err) {
      if (abortController.signal.aborted) return;
      console.error('[FinPlanner] Retirement advice error:', err instanceof Error ? err.message : 'Unknown error');
      setError('Unable to get retirement advice. Please check your API key and try again.');
    } finally {
      if (!abortController.signal.aborted) {
        setLoading(false);
      }
    }
  }, [household, accounts, incomeStreams, spending, taxes, market, strategy, latestResult]);

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
        <div className={styles.actionRow}>
          <Button appearance="primary" onClick={handleGetAdvice} disabled={loading}>
            {loading ? <Spinner size="tiny" /> : 'Get Retirement Advice'}
          </Button>
          <Badge appearance="outline">
            {hasApiKey ? 'AI mode' : 'Fallback mode'}
          </Badge>
        </div>
      </Card>
      {error && (
        <MessageBar intent="error">
          <MessageBarBody>{error}</MessageBarBody>
        </MessageBar>
      )}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader header={<Text weight="semibold">Recommendations</Text>} />
          <div className={styles.adviceList}>
            {recommendations.map((rec, i) => (
              <div key={i} className={styles.recommendation}>
                <div className={styles.recHeader}>
                  <Text weight="semibold">{rec.title}</Text>
                  <Badge appearance="outline" size="small">{rec.source}</Badge>
                </div>
                <Text>{rec.description}</Text>
              </div>
            ))}
          </div>
          {disclaimer && (
            <MessageBar intent="warning" className={styles.disclaimerBar}>
              <MessageBarBody>{disclaimer}</MessageBarBody>
            </MessageBar>
          )}
        </Card>
      )}
    </div>
  );
}
