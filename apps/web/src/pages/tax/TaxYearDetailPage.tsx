import {
  makeStyles,
  tokens,
  Card,
  CardHeader,
  Text,
  Title3,
  Badge,
  TabList,
  Tab,
  Field,
  Input,
  Switch,
  Button,
  Select,
  MessageBar,
  MessageBarBody,
} from '@fluentui/react-components';
import { CalendarRegular, SaveRegular } from '@fluentui/react-icons';
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useTaxStore } from '../../stores/tax-store.js';
import type { TaxYearRecord, TaxYearStatus, TaxYearIncome, TaxYearDeductions, TaxYearCredits, TaxYearPayments } from '@finplanner/domain';

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL },
  header: { display: 'flex', gap: tokens.spacingHorizontalM, alignItems: 'center' },
  form: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM, maxWidth: '700px' },
  row: { display: 'flex', gap: tokens.spacingHorizontalL },
  actions: { display: 'flex', gap: tokens.spacingHorizontalM, paddingTop: tokens.spacingVerticalM },
  statusSelect: { width: '120px' },
});

function CurrencyField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <Field label={label}>
      <Input type="number" value={String(value)} onChange={(_, d) => onChange(Number(d.value))} />
    </Field>
  );
}

const statusColors: Record<TaxYearStatus, 'success' | 'warning' | 'informative' | 'important'> = {
  filed: 'success', draft: 'warning', ready: 'informative', amended: 'important',
};

export function TaxYearDetailPage() {
  const styles = useStyles();
  const { year } = useParams<{ year: string }>();
  const navigate = useNavigate();
  const yearNum = Number(year);
  const taxYear = useTaxStore((s) => s.taxYears.find((ty) => ty.taxYear === yearNum));
  const updateTaxYear = useTaxStore((s) => s.updateTaxYear);
  const [activeTab, setActiveTab] = useState('income');
  const [saved, setSaved] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    return () => {
      clearTimeout(savedTimerRef.current);
    };
  }, []);

  const [draft, setDraft] = useState<TaxYearRecord | null>(taxYear ?? null);

  const updateIncome = useCallback((field: keyof TaxYearIncome, value: number) => {
    setDraft((d) => d ? { ...d, income: { ...d.income, [field]: value } } : null);
  }, []);

  const updateDeductions = useCallback((field: keyof TaxYearDeductions, value: number | boolean) => {
    setDraft((d) => d ? { ...d, deductions: { ...d.deductions, [field]: value } } : null);
  }, []);

  const updateCredits = useCallback((field: keyof TaxYearCredits, value: number) => {
    setDraft((d) => d ? { ...d, credits: { ...d.credits, [field]: value } } : null);
  }, []);

  const updatePayments = useCallback((field: keyof TaxYearPayments, value: number) => {
    setDraft((d) => d ? { ...d, payments: { ...d.payments, [field]: value } } : null);
  }, []);

  const handleSave = useCallback(() => {
    if (!draft) return;
    updateTaxYear(yearNum, draft);
    setSaved(true);
    clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setSaved(false), 2000);
  }, [draft, yearNum, updateTaxYear]);

  if (!draft) {
    return (
      <div className={styles.root}>
        <Title3>Tax Year {year} not found</Title3>
        <Button onClick={() => navigate('/tax')}>Back to Tax Years</Button>
      </div>
    );
  }

  const totalIncome = Object.values(draft.income).reduce((s, v) => s + v, 0) - draft.income.capitalLosses;

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <Title3>
          <CalendarRegular /> Tax Year {year}
        </Title3>
        <Badge appearance="filled" color={statusColors[draft.status]}>{draft.status}</Badge>
        <Select
          value={draft.status}
          onChange={(_, data) => setDraft((d) => d ? { ...d, status: data.value as TaxYearStatus } : null)}
          className={styles.statusSelect}
        >
          <option value="draft">Draft</option>
          <option value="ready">Ready</option>
          <option value="filed">Filed</option>
          <option value="amended">Amended</option>
        </Select>
      </div>
      {saved && (
        <MessageBar intent="success">
          <MessageBarBody>Tax year {year} saved.</MessageBarBody>
        </MessageBar>
      )}
      <TabList selectedValue={activeTab} onTabSelect={(_, data) => setActiveTab(data.value as string)}>
        <Tab value="income">Income</Tab>
        <Tab value="deductions">Deductions</Tab>
        <Tab value="credits">Credits</Tab>
        <Tab value="payments">Payments</Tab>
        <Tab value="summary">Summary</Tab>
      </TabList>

      {activeTab === 'income' && (
        <Card>
          <CardHeader header={<Text weight="semibold">Income</Text>} description={`Total gross: $${totalIncome.toLocaleString()}`} />
          <div className={styles.form}>
            <div className={styles.row}>
              <CurrencyField label="Wages (W-2)" value={draft.income.wages} onChange={(v) => updateIncome('wages', v)} />
              <CurrencyField label="Self-Employment" value={draft.income.selfEmploymentIncome} onChange={(v) => updateIncome('selfEmploymentIncome', v)} />
            </div>
            <div className={styles.row}>
              <CurrencyField label="Interest" value={draft.income.interestIncome} onChange={(v) => updateIncome('interestIncome', v)} />
              <CurrencyField label="Dividends" value={draft.income.dividendIncome} onChange={(v) => updateIncome('dividendIncome', v)} />
            </div>
            <div className={styles.row}>
              <CurrencyField label="Qualified Dividends" value={draft.income.qualifiedDividends} onChange={(v) => updateIncome('qualifiedDividends', v)} />
              <CurrencyField label="Capital Gains" value={draft.income.capitalGains} onChange={(v) => updateIncome('capitalGains', v)} />
            </div>
            <div className={styles.row}>
              <CurrencyField label="Capital Losses" value={draft.income.capitalLosses} onChange={(v) => updateIncome('capitalLosses', v)} />
              <CurrencyField label="Rental Income" value={draft.income.rentalIncome} onChange={(v) => updateIncome('rentalIncome', v)} />
            </div>
            <div className={styles.row}>
              <CurrencyField label="NQDC Distributions" value={draft.income.nqdcDistributions} onChange={(v) => updateIncome('nqdcDistributions', v)} />
              <CurrencyField label="Retirement Distributions" value={draft.income.retirementDistributions} onChange={(v) => updateIncome('retirementDistributions', v)} />
            </div>
            <div className={styles.row}>
              <CurrencyField label="Social Security" value={draft.income.socialSecurityIncome} onChange={(v) => updateIncome('socialSecurityIncome', v)} />
              <CurrencyField label="Other Income" value={draft.income.otherIncome} onChange={(v) => updateIncome('otherIncome', v)} />
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'deductions' && (
        <Card>
          <CardHeader header={<Text weight="semibold">Deductions</Text>} />
          <div className={styles.form}>
            <CurrencyField label="Standard Deduction" value={draft.deductions.standardDeduction} onChange={(v) => updateDeductions('standardDeduction', v)} />
            <Switch
              label="Use Itemized Deductions"
              checked={draft.deductions.useItemized}
              onChange={(_, data) => updateDeductions('useItemized', data.checked)}
            />
            {draft.deductions.useItemized && draft.deductions.itemizedDeductions && (
              <>
                <CurrencyField label="Mortgage Interest" value={draft.deductions.itemizedDeductions.mortgageInterest} onChange={(v) => setDraft((d) => d ? { ...d, deductions: { ...d.deductions, itemizedDeductions: { ...d.deductions.itemizedDeductions!, mortgageInterest: v } } } : null)} />
                <CurrencyField label="State & Local Taxes (SALT)" value={draft.deductions.itemizedDeductions.stateAndLocalTaxes} onChange={(v) => setDraft((d) => d ? { ...d, deductions: { ...d.deductions, itemizedDeductions: { ...d.deductions.itemizedDeductions!, stateAndLocalTaxes: v } } } : null)} />
                <CurrencyField label="Charitable Contributions" value={draft.deductions.itemizedDeductions.charitableContributions} onChange={(v) => setDraft((d) => d ? { ...d, deductions: { ...d.deductions, itemizedDeductions: { ...d.deductions.itemizedDeductions!, charitableContributions: v } } } : null)} />
                <CurrencyField label="Medical Expenses" value={draft.deductions.itemizedDeductions.medicalExpenses} onChange={(v) => setDraft((d) => d ? { ...d, deductions: { ...d.deductions, itemizedDeductions: { ...d.deductions.itemizedDeductions!, medicalExpenses: v } } } : null)} />
                <CurrencyField label="Other Itemized" value={draft.deductions.itemizedDeductions.other} onChange={(v) => setDraft((d) => d ? { ...d, deductions: { ...d.deductions, itemizedDeductions: { ...d.deductions.itemizedDeductions!, other: v } } } : null)} />
              </>
            )}
          </div>
        </Card>
      )}

      {activeTab === 'credits' && (
        <Card>
          <CardHeader header={<Text weight="semibold">Tax Credits</Text>} />
          <div className={styles.form}>
            <CurrencyField label="Child Tax Credit" value={draft.credits.childTaxCredit} onChange={(v) => updateCredits('childTaxCredit', v)} />
            <CurrencyField label="Education Credits" value={draft.credits.educationCredits} onChange={(v) => updateCredits('educationCredits', v)} />
            <CurrencyField label="Foreign Tax Credit" value={draft.credits.foreignTaxCredit} onChange={(v) => updateCredits('foreignTaxCredit', v)} />
            <CurrencyField label="Other Credits" value={draft.credits.otherCredits} onChange={(v) => updateCredits('otherCredits', v)} />
          </div>
        </Card>
      )}

      {activeTab === 'payments' && (
        <Card>
          <CardHeader header={<Text weight="semibold">Payments & Withholding</Text>} />
          <div className={styles.form}>
            <div className={styles.row}>
              <CurrencyField label="Federal Withheld" value={draft.payments.federalWithheld} onChange={(v) => updatePayments('federalWithheld', v)} />
              <CurrencyField label="State Withheld" value={draft.payments.stateWithheld} onChange={(v) => updatePayments('stateWithheld', v)} />
            </div>
            <div className={styles.row}>
              <CurrencyField label="Estimated (Federal)" value={draft.payments.estimatedPaymentsFederal} onChange={(v) => updatePayments('estimatedPaymentsFederal', v)} />
              <CurrencyField label="Estimated (State)" value={draft.payments.estimatedPaymentsState} onChange={(v) => updatePayments('estimatedPaymentsState', v)} />
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'summary' && (
        <Card>
          <CardHeader header={<Text weight="semibold">Tax Summary</Text>} />
          <div className={styles.form}>
            <div className={styles.row}>
              <CurrencyField label="Computed Federal Tax" value={draft.computedFederalTax} onChange={(v) => setDraft((d) => d ? { ...d, computedFederalTax: v } : null)} />
              <CurrencyField label="Computed State Tax" value={draft.computedStateTax} onChange={(v) => setDraft((d) => d ? { ...d, computedStateTax: v } : null)} />
            </div>
            <Text>
              Effective Federal Rate: {draft.computedEffectiveFederalRate.toFixed(1)}% | Effective State Rate: {draft.computedEffectiveStateRate.toFixed(1)}%
            </Text>
          </div>
        </Card>
      )}

      <div className={styles.actions}>
        <Button appearance="primary" icon={<SaveRegular />} onClick={handleSave}>
          Save Tax Year
        </Button>
        <Button appearance="secondary" onClick={() => navigate('/tax')}>
          Back to Tax Years
        </Button>
      </div>
    </div>
  );
}
