import {
  makeStyles,
  tokens,
  Card,
  CardHeader,
  Text,
  Title3,
  Badge,
  Button,
  Field,
  Select,
  Spinner,
  MessageBar,
  MessageBarBody,
} from '@fluentui/react-components';
import { LightbulbRegular } from '@fluentui/react-icons';
import { useState, useCallback, useEffect, useRef } from 'react';
import { getTaxStrategyAdvice } from '@finplanner/claude';
import type { TaxStrategyAdviceRequest } from '@finplanner/domain';
import { useTaxStore } from '../../stores/tax-store.js';
import { useSharedStore } from '../../stores/shared-store.js';
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
  controlRow: { display: 'flex', gap: tokens.spacingHorizontalM, alignItems: 'flex-end' },
  recommendationHeader: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    alignItems: 'center',
    marginBottom: tokens.spacingVerticalXS,
  },
  disclaimerBar: { marginTop: tokens.spacingVerticalM },
});

interface Recommendation {
  title: string;
  description: string;
  source: 'llm' | 'fallback';
}

export function TaxAdvicePage() {
  const styles = useStyles();
  const { taxYears } = useTaxStore();
  const { household, accounts, incomeStreams } = useSharedStore();
  const { hasApiKey } = useSettingsStore();
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
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
    if (!selectedYear) return;

    // Abort any in-flight request
    abortControllerRef.current?.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setLoading(true);
    setError('');

    try {
      const taxYear = taxYears.find((ty) => ty.taxYear === selectedYear);
      if (!taxYear) {
        setLoading(false);
        return;
      }

      const priorYear = taxYears.find((ty) => ty.taxYear === selectedYear - 1) ?? null;
      const apiKey = await getApiKey();

      if (abortController.signal.aborted) return;

      const request: TaxStrategyAdviceRequest = {
        taxYear: selectedYear,
        taxYearRecord: taxYear,
        priorYearRecord: priorYear,
        sharedCorpus: {
          household,
          accounts,
          incomeStreams,
        },
        userPreferences: {
          prioritize: 'minimize_tax',
        },
      };

      const client = apiKey ? createLlmClient(apiKey, undefined, abortController.signal) : undefined;
      const response = await getTaxStrategyAdvice(request, client);

      if (abortController.signal.aborted) return;

      setRecommendations(
        response.recommendations.map((r) => ({
          title: r.title,
          description: r.rationale,
          source: r.source,
        })),
      );
      setDisclaimer(response.disclaimer);
    } catch (err) {
      if (abortController.signal.aborted) return;
      console.error('[FinPlanner] Tax advice error:', err instanceof Error ? err.message : 'Unknown error');
      setError('Unable to get tax advice. Please check your API key and try again.');
    } finally {
      if (!abortController.signal.aborted) {
        setLoading(false);
      }
    }
  }, [selectedYear, taxYears, household, accounts, incomeStreams]);

  return (
    <div className={styles.root}>
      <Title3>
        <LightbulbRegular /> Tax Strategy Advice
      </Title3>
      <MessageBar intent="info">
        <MessageBarBody>
          Tax advice is generated using {hasApiKey ? 'Claude AI' : 'rule-based analysis (fallback mode)'}. No personally identifiable information is sent to the API.
        </MessageBarBody>
      </MessageBar>
      <Card>
        <CardHeader
          header={<Text weight="semibold">Get Tax Advice</Text>}
          description={hasApiKey ? 'Claude API key configured.' : 'No API key — using fallback rules.'}
        />
        <div className={styles.controlRow}>
          <Field label="Tax Year">
            <Select
              value={selectedYear ? String(selectedYear) : ''}
              onChange={(_, data) => setSelectedYear(data.value ? Number(data.value) : null)}
            >
              <option value="">Select...</option>
              {taxYears.map((ty) => (
                <option key={ty.taxYear} value={String(ty.taxYear)}>{ty.taxYear}</option>
              ))}
            </Select>
          </Field>
          <Button
            appearance="primary"
            onClick={handleGetAdvice}
            disabled={!selectedYear || loading}
          >
            {loading ? <Spinner size="tiny" /> : 'Get Tax Advice'}
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
                <div className={styles.recommendationHeader}>
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
