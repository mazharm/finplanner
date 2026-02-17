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
  Switch,
  MessageBar,
  MessageBarBody,
} from '@fluentui/react-components';
import { PeopleRegular, SaveRegular } from '@fluentui/react-icons';
import { useState, useCallback, useRef, useEffect } from 'react';
import { useSharedStore } from '../stores/shared-store.js';
import { safeParseNumber } from '../utils/parse-number.js';
import type { FilingStatus, PersonProfile, HouseholdProfile } from '@finplanner/domain';

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL },
  form: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM, maxWidth: '600px' },
  row: { display: 'flex', gap: tokens.spacingHorizontalL },
  actions: { display: 'flex', gap: tokens.spacingHorizontalM, paddingTop: tokens.spacingVerticalM },
});

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
];

export function HouseholdPage() {
  const styles = useStyles();
  const { household, setHousehold } = useSharedStore();
  const storeHousehold = useSharedStore((s) => s.household);
  const [saved, setSaved] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    return () => {
      clearTimeout(savedTimerRef.current);
    };
  }, []);

  const [draft, setDraft] = useState<HouseholdProfile>({ ...household });
  const [hasSpouse, setHasSpouse] = useState(!!household.spouse);

  // Sync draft when store changes externally (e.g., import, sync)
  useEffect(() => {
    setDraft(storeHousehold);
    setHasSpouse(!!storeHousehold.spouse);
  }, [storeHousehold]);

  const updatePrimary = useCallback((field: keyof PersonProfile, value: number) => {
    setDraft((d) => ({
      ...d,
      primary: { ...d.primary, [field]: value },
    }));
  }, []);

  const updateSpouse = useCallback((field: keyof PersonProfile, value: number) => {
    setDraft((d) => ({
      ...d,
      spouse: d.spouse ? { ...d.spouse, [field]: value } : undefined,
    }));
  }, []);

  const toggleSpouse = useCallback((checked: boolean) => {
    setHasSpouse(checked);
    if (checked) {
      setDraft((d) => ({
        ...d,
        maritalStatus: 'married' as const,
        filingStatus: 'mfj' as FilingStatus,
        spouse: d.spouse ?? {
          id: 'spouse' as const,
          birthYear: 1990,
          currentAge: 35,
          retirementAge: 65,
          lifeExpectancy: 90,
        },
      }));
    } else {
      // Keep spouse data in draft state (in case user toggles back) but update
      // marital/filing status. Spouse is excluded on save when hasSpouse is false.
      setDraft((d) => ({
        ...d,
        maritalStatus: 'single' as const,
        filingStatus: 'single' as FilingStatus,
      }));
    }
  }, []);

  const handleSave = useCallback(() => {
    const toSave = hasSpouse ? draft : { ...draft, spouse: undefined };
    setHousehold(toSave);
    setSaved(true);
    clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setSaved(false), 2000);
  }, [draft, hasSpouse, setHousehold]);

  return (
    <div className={styles.root}>
      <Title3>
        <PeopleRegular /> Household Profile
      </Title3>
      {saved && (
        <MessageBar intent="success">
          <MessageBarBody>Household profile saved.</MessageBarBody>
        </MessageBar>
      )}
      <Card>
        <CardHeader header={<Text weight="semibold">Filing Status</Text>} />
        <div className={styles.form}>
          <Field label="Filing Status">
            <Select
              value={draft.filingStatus}
              onChange={(_, data) =>
                setDraft((d) => ({ ...d, filingStatus: data.value as FilingStatus }))
              }
            >
              <option value="single">Single</option>
              <option value="mfj">Married Filing Jointly</option>
              <option value="survivor">Surviving Spouse</option>
            </Select>
          </Field>
          <Field label="State of Residence">
            <Select
              value={draft.stateOfResidence}
              onChange={(_, data) => setDraft((d) => ({ ...d, stateOfResidence: data.value }))}
            >
              {US_STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
          </Field>
          <Switch
            label="Has spouse"
            checked={hasSpouse}
            onChange={(_, data) => toggleSpouse(data.checked)}
          />
        </div>
      </Card>
      <Card>
        <CardHeader header={<Text weight="semibold">Primary Person</Text>} />
        <div className={styles.form}>
          <div className={styles.row}>
            <Field label="Birth Year">
              <Input
                type="number"
                value={String(draft.primary.birthYear)}
                onChange={(_, data) => updatePrimary('birthYear', safeParseNumber(data.value))}
              />
            </Field>
            <Field label="Current Age">
              <Input
                type="number"
                value={String(draft.primary.currentAge)}
                onChange={(_, data) => updatePrimary('currentAge', safeParseNumber(data.value))}
              />
            </Field>
          </div>
          <div className={styles.row}>
            <Field label="Retirement Age">
              <Input
                type="number"
                value={String(draft.primary.retirementAge)}
                onChange={(_, data) => updatePrimary('retirementAge', safeParseNumber(data.value))}
              />
            </Field>
            <Field label="Life Expectancy">
              <Input
                type="number"
                value={String(draft.primary.lifeExpectancy)}
                onChange={(_, data) => updatePrimary('lifeExpectancy', safeParseNumber(data.value))}
              />
            </Field>
          </div>
        </div>
      </Card>
      {hasSpouse && draft.spouse && (
        <Card>
          <CardHeader header={<Text weight="semibold">Spouse</Text>} />
          <div className={styles.form}>
            <div className={styles.row}>
              <Field label="Birth Year">
                <Input
                  type="number"
                  value={String(draft.spouse.birthYear)}
                  onChange={(_, data) => updateSpouse('birthYear', safeParseNumber(data.value))}
                />
              </Field>
              <Field label="Current Age">
                <Input
                  type="number"
                  value={String(draft.spouse.currentAge)}
                  onChange={(_, data) => updateSpouse('currentAge', safeParseNumber(data.value))}
                />
              </Field>
            </div>
            <div className={styles.row}>
              <Field label="Retirement Age">
                <Input
                  type="number"
                  value={String(draft.spouse.retirementAge)}
                  onChange={(_, data) => updateSpouse('retirementAge', safeParseNumber(data.value))}
                />
              </Field>
              <Field label="Life Expectancy">
                <Input
                  type="number"
                  value={String(draft.spouse.lifeExpectancy)}
                  onChange={(_, data) => updateSpouse('lifeExpectancy', safeParseNumber(data.value))}
                />
              </Field>
            </div>
          </div>
        </Card>
      )}
      <div className={styles.actions}>
        <Button appearance="primary" icon={<SaveRegular />} onClick={handleSave}>
          Save Household
        </Button>
      </div>
    </div>
  );
}
