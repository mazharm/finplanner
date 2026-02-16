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
  Button,
  MessageBar,
  MessageBarBody,
} from '@fluentui/react-components';
import { SlideSizeRegular, SaveRegular } from '@fluentui/react-icons';
import { useState, useCallback, useRef, useEffect } from 'react';
import { useRetirementStore } from '../../stores/retirement-store.js';
import { safeParseNumber } from '../../utils/parse-number.js';
import type { TaxConfig, MarketConfig, SimulationMode } from '@finplanner/domain';

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL },
  form: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM, maxWidth: '600px' },
  row: { display: 'flex', gap: tokens.spacingHorizontalL },
  actions: { display: 'flex', gap: tokens.spacingHorizontalM },
});

export function AssumptionsPage() {
  const styles = useStyles();
  const { taxes, market, setTaxes, setMarket } = useRetirementStore();
  const [draftTaxes, setDraftTaxes] = useState<TaxConfig>({ ...taxes });
  const [draftMarket, setDraftMarket] = useState<MarketConfig>({ ...market });
  const [saved, setSaved] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    return () => {
      clearTimeout(savedTimerRef.current);
    };
  }, []);

  const handleSave = useCallback(() => {
    setTaxes(draftTaxes);
    setMarket(draftMarket);
    setSaved(true);
    clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setSaved(false), 2000);
  }, [draftTaxes, draftMarket, setTaxes, setMarket]);

  return (
    <div className={styles.root}>
      <Title3>
        <SlideSizeRegular /> Market &amp; Tax Assumptions
      </Title3>
      {saved && (
        <MessageBar intent="success">
          <MessageBarBody>Assumptions saved.</MessageBarBody>
        </MessageBar>
      )}
      <Card>
        <CardHeader header={<Text weight="semibold">Market Assumptions</Text>} />
        <div className={styles.form}>
          <Field label="Simulation Mode">
            <Select
              value={draftMarket.simulationMode}
              onChange={(_, d) => setDraftMarket((m) => ({ ...m, simulationMode: d.value as SimulationMode }))}
            >
              <option value="deterministic">Deterministic</option>
              <option value="historical">Historical Scenarios</option>
              <option value="stress">Stress Tests</option>
              <option value="monteCarlo">Monte Carlo</option>
            </Select>
          </Field>
          {draftMarket.simulationMode === 'deterministic' && (
            <div className={styles.row}>
              <Field label="Annual Return (%)">
                <Input
                  type="number"
                  value={String(draftMarket.deterministicReturnPct ?? 7)}
                  onChange={(_, d) => setDraftMarket((m) => ({ ...m, deterministicReturnPct: safeParseNumber(d.value) }))}
                />
              </Field>
              <Field label="Inflation (%)">
                <Input
                  type="number"
                  value={String(draftMarket.deterministicInflationPct ?? 2.5)}
                  onChange={(_, d) => setDraftMarket((m) => ({ ...m, deterministicInflationPct: safeParseNumber(d.value) }))}
                />
              </Field>
            </div>
          )}
          {draftMarket.simulationMode === 'monteCarlo' && (
            <Field label="Number of Runs">
              <Input
                type="number"
                value={String(draftMarket.monteCarloRuns ?? 10000)}
                onChange={(_, d) => setDraftMarket((m) => ({ ...m, monteCarloRuns: safeParseNumber(d.value, 10000) }))}
              />
            </Field>
          )}
        </div>
      </Card>
      <Card>
        <CardHeader header={<Text weight="semibold">Tax Assumptions</Text>} />
        <div className={styles.form}>
          <div className={styles.row}>
            <Field label="Federal Model">
              <Select
                value={draftTaxes.federalModel}
                onChange={(_, d) => setDraftTaxes((t) => ({ ...t, federalModel: d.value as TaxConfig['federalModel'] }))}
              >
                <option value="effective">Effective Rate</option>
                <option value="bracket">Bracket-Based</option>
              </Select>
            </Field>
            <Field label="State Model">
              <Select
                value={draftTaxes.stateModel}
                onChange={(_, d) => setDraftTaxes((t) => ({ ...t, stateModel: d.value as TaxConfig['stateModel'] }))}
              >
                <option value="none">None (No State Tax)</option>
                <option value="effective">Effective Rate</option>
                <option value="bracket">Bracket-Based</option>
              </Select>
            </Field>
          </div>
          <div className={styles.row}>
            <Field label="Federal Effective Rate (%)">
              <Input
                type="number"
                value={String(draftTaxes.federalEffectiveRatePct ?? 22)}
                onChange={(_, d) => setDraftTaxes((t) => ({ ...t, federalEffectiveRatePct: safeParseNumber(d.value) }))}
              />
            </Field>
            <Field label="State Effective Rate (%)">
              <Input
                type="number"
                value={String(draftTaxes.stateEffectiveRatePct ?? 0)}
                onChange={(_, d) => setDraftTaxes((t) => ({ ...t, stateEffectiveRatePct: safeParseNumber(d.value) }))}
              />
            </Field>
          </div>
          <Field label="Capital Gains Rate (%)">
            <Input
              type="number"
              value={String(draftTaxes.capGainsRatePct ?? 15)}
              onChange={(_, d) => setDraftTaxes((t) => ({ ...t, capGainsRatePct: safeParseNumber(d.value) }))}
            />
          </Field>
        </div>
      </Card>
      <div className={styles.actions}>
        <Button appearance="primary" icon={<SaveRegular />} onClick={handleSave}>
          Save Assumptions
        </Button>
      </div>
    </div>
  );
}
