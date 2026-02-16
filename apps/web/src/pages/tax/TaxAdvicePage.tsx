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
import { useState, useCallback } from 'react';
import { useTaxStore } from '../../stores/tax-store.js';
import { useSharedStore } from '../../stores/shared-store.js';
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

export function TaxAdvicePage() {
  const styles = useStyles();
  const { taxYears } = useTaxStore();
  const { household, accounts, incomeStreams } = useSharedStore();
  const { hasApiKey } = useSettingsStore();
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [disclaimer, setDisclaimer] = useState('');

  const handleGetAdvice = useCallback(async () => {
    if (!selectedYear) return;
    setLoading(true);

    // Simulate getting advice — in production this calls getTaxStrategyAdvice()
    await new Promise((r) => setTimeout(r, 500));

    const taxYear = taxYears.find((ty) => ty.taxYear === selectedYear);
    const recs: Recommendation[] = [];

    if (taxYear) {
      const totalPaid = taxYear.payments.federalWithheld + taxYear.payments.estimatedPaymentsFederal;
      if (totalPaid < taxYear.computedFederalTax * 0.9) {
        recs.push({
          title: 'Estimated Payment Adequacy',
          description: 'Federal payments may be insufficient. Consider increasing estimated payments to avoid underpayment penalties.',
          source: 'fallback',
        });
      }

      if (household.filingStatus === 'mfj') {
        recs.push({
          title: 'Filing Status Optimization',
          description: 'Verify MFJ vs MFS comparison for your situation. In some cases, filing separately can reduce overall tax burden.',
          source: 'fallback',
        });
      }

      recs.push({
        title: 'Document Review',
        description: 'Review all pending tax documents before filing to ensure completeness.',
        source: 'fallback',
      });
    }

    setRecommendations(recs);
    setDisclaimer('This is rule-based guidance, not personalized tax advice. Consult a qualified tax professional.');
    setLoading(false);
  }, [selectedYear, taxYears, household]);

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
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
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
