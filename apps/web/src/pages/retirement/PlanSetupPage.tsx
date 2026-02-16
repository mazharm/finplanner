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
import { useState, useCallback } from 'react';
import { useRetirementStore } from '../../stores/retirement-store.js';
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

  const handleSave = useCallback(() => {
    setSpending(draftSpending);
    setStrategy(draftStrategy);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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
                onChange={(_, d) => setDraftSpending((s) => ({ ...s, targetAnnualSpend: Number(d.value) }))}
              />
            </Field>
            <Field label="Inflation (%)">
              <Input
                type="number"
                value={String(draftSpending.inflationPct)}
                onChange={(_, d) => setDraftSpending((s) => ({ ...s, inflationPct: Number(d.value) }))}
              />
            </Field>
          </div>
          <div className={styles.row}>
            <Field label="Floor Spending ($)">
              <Input
                type="number"
                value={String(draftSpending.floorAnnualSpend ?? 0)}
                onChange={(_, d) => setDraftSpending((s) => ({ ...s, floorAnnualSpend: Number(d.value) }))}
              />
            </Field>
            <Field label="Ceiling Spending ($)">
              <Input
                type="number"
                value={String(draftSpending.ceilingAnnualSpend ?? 0)}
                onChange={(_, d) => setDraftSpending((s) => ({ ...s, ceilingAnnualSpend: Number(d.value) || undefined }))}
              />
            </Field>
          </div>
          <Field label="Survivor Spending Adjustment (%)">
            <Input
              type="number"
              value={String(draftSpending.survivorSpendingAdjustmentPct)}
              onChange={(_, d) => setDraftSpending((s) => ({ ...s, survivorSpendingAdjustmentPct: Number(d.value) }))}
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
