import {
  makeStyles,
  tokens,
  Card,
  CardHeader,
  Text,
  Title3,
  Field,
  Input,
  Select,
  Switch,
  Button,
  MessageBar,
  MessageBarBody,
} from '@fluentui/react-components';
import { CalculatorRegular, SaveRegular } from '@fluentui/react-icons';
import { useState, useCallback, useRef, useEffect } from 'react';
import { useRetirementStore } from '../../stores/retirement-store.js';
import { safeParseNumber } from '../../utils/parse-number.js';
import type { SpendingPlan, StrategyConfig } from '@finplanner/domain';

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL },
  form: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM, maxWidth: '600px' },
  row: { display: 'flex', gap: tokens.spacingHorizontalL },
  actions: { display: 'flex', gap: tokens.spacingHorizontalM },
});

export function PlanSetupPage() {
  const styles = useStyles();
  const { spending, strategy, setSpending, setStrategy } = useRetirementStore();
  const [draftSpending, setDraftSpending] = useState<SpendingPlan>({ ...spending });
  const [draftStrategy, setDraftStrategy] = useState<StrategyConfig>({ ...strategy });
  const [saved, setSaved] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    return () => {
      clearTimeout(savedTimerRef.current);
    };
  }, []);

  // Sync drafts when store changes externally (e.g., import, sync)
  useEffect(() => { setDraftSpending({ ...spending }); }, [spending]);
  useEffect(() => { setDraftStrategy({ ...strategy }); }, [strategy]);

  const handleSave = useCallback(() => {
    setSpending(draftSpending);
    setStrategy(draftStrategy);
    setSaved(true);
    clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setSaved(false), 2000);
  }, [draftSpending, draftStrategy, setSpending, setStrategy]);

  return (
    <div className={styles.root}>
      <Title3>
        <CalculatorRegular /> Retirement Plan Setup
      </Title3>
      {saved && (
        <MessageBar intent="success">
          <MessageBarBody>Retirement plan saved.</MessageBarBody>
        </MessageBar>
      )}
      <Card>
        <CardHeader header={<Text weight="semibold">Spending Plan</Text>} />
        <div className={styles.form}>
          <div className={styles.row}>
            <Field label="Annual Spending ($)">
              <Input
                type="number"
                value={String(draftSpending.targetAnnualSpend)}
                onChange={(_, d) => setDraftSpending((s) => ({ ...s, targetAnnualSpend: safeParseNumber(d.value) }))}
              />
            </Field>
            <Field label="Inflation (%)">
              <Input
                type="number"
                value={String(draftSpending.inflationPct)}
                onChange={(_, d) => setDraftSpending((s) => ({ ...s, inflationPct: safeParseNumber(d.value, 2.5, -10, 30) }))}
              />
            </Field>
          </div>
          <div className={styles.row}>
            <Field label="Floor Spending ($)">
              <Input
                type="number"
                value={String(draftSpending.floorAnnualSpend ?? 0)}
                onChange={(_, d) => setDraftSpending((s) => ({ ...s, floorAnnualSpend: safeParseNumber(d.value) }))}
              />
            </Field>
            <Field label="Ceiling Spending ($)">
              <Input
                type="number"
                value={String(draftSpending.ceilingAnnualSpend ?? 0)}
                onChange={(_, d) => setDraftSpending((s) => ({ ...s, ceilingAnnualSpend: safeParseNumber(d.value) || undefined }))}
              />
            </Field>
          </div>
          <Field label="Survivor Spending Adjustment (%)">
            <Input
              type="number"
              value={String(draftSpending.survivorSpendingAdjustmentPct)}
              onChange={(_, d) => setDraftSpending((s) => ({ ...s, survivorSpendingAdjustmentPct: safeParseNumber(d.value, 70, 0, 100) }))}
            />
          </Field>
        </div>
      </Card>
      <Card>
        <CardHeader header={<Text weight="semibold">Withdrawal Strategy</Text>} />
        <div className={styles.form}>
          <Field label="Withdrawal Order">
            <Select
              value={draftStrategy.withdrawalOrder}
              onChange={(_, d) => setDraftStrategy((s) => ({ ...s, withdrawalOrder: d.value as StrategyConfig['withdrawalOrder'] }))}
            >
              <option value="taxableFirst">Taxable First (Conventional)</option>
              <option value="taxDeferredFirst">Tax-Deferred First</option>
              <option value="proRata">Pro Rata (Proportional)</option>
              <option value="taxOptimized">Tax-Optimized</option>
            </Select>
          </Field>
          <Field label="Rebalance Frequency">
            <Select
              value={draftStrategy.rebalanceFrequency}
              onChange={(_, d) => setDraftStrategy((s) => ({ ...s, rebalanceFrequency: d.value as StrategyConfig['rebalanceFrequency'] }))}
            >
              <option value="none">None</option>
              <option value="annual">Annual</option>
              <option value="quarterly">Quarterly</option>
            </Select>
          </Field>
          <Switch
            label="Enable Guardrail Spending Rules"
            checked={draftStrategy.guardrailsEnabled}
            onChange={(_, d) => setDraftStrategy((s) => ({ ...s, guardrailsEnabled: d.checked }))}
          />
        </div>
      </Card>
      <div className={styles.actions}>
        <Button appearance="primary" icon={<SaveRegular />} onClick={handleSave}>
          Save Plan
        </Button>
      </div>
    </div>
  );
}
