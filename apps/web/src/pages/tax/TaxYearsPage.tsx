import {
  makeStyles,
  tokens,
  Card,
  CardHeader,
  Text,
  Title3,
  Button,
  Badge,
  Table,
  TableHeader,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogTrigger,
  Field,
  Input,
  Select,
} from '@fluentui/react-components';
import { CalendarRegular, AddRegular, DeleteRegular, OpenRegular } from '@fluentui/react-icons';
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTaxStore } from '../../stores/tax-store.js';
import { useSharedStore } from '../../stores/shared-store.js';
import { safeParseNumber } from '../../utils/parse-number.js';
import type { TaxYearRecord, TaxYearStatus, FilingStatus } from '@finplanner/domain';

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  form: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM },
  errorText: { color: tokens.colorPaletteRedForeground1 },
});

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

const statusColors: Record<TaxYearStatus, 'success' | 'warning' | 'informative' | 'important'> = {
  filed: 'success',
  draft: 'warning',
  ready: 'informative',
  amended: 'important',
};

function emptyTaxYear(year: number, filingStatus: FilingStatus, state: string): TaxYearRecord {
  return {
    taxYear: year,
    status: 'draft',
    filingStatus,
    stateOfResidence: state,
    income: {
      wages: 0, selfEmploymentIncome: 0, interestIncome: 0, dividendIncome: 0,
      qualifiedDividends: 0, capitalGains: 0, capitalLosses: 0, rentalIncome: 0,
      nqdcDistributions: 0, retirementDistributions: 0, socialSecurityIncome: 0, otherIncome: 0,
    },
    deductions: { standardDeduction: 29200, useItemized: false },
    credits: { childTaxCredit: 0, educationCredits: 0, foreignTaxCredit: 0, otherCredits: 0 },
    payments: { federalWithheld: 0, stateWithheld: 0, estimatedPaymentsFederal: 0, estimatedPaymentsState: 0 },
    computedFederalTax: 0,
    computedStateTax: 0,
    computedEffectiveFederalRate: 0,
    computedEffectiveStateRate: 0,
    documentIds: [],
  };
}

export function TaxYearsPage() {
  const styles = useStyles();
  const navigate = useNavigate();
  const { taxYears, addTaxYear, removeTaxYear } = useTaxStore();
  const { household } = useSharedStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newYear, setNewYear] = useState(new Date().getFullYear());
  const [deleteYear, setDeleteYear] = useState<number | null>(null);

  const handleAdd = useCallback(() => {
    if (taxYears.some((ty) => ty.taxYear === newYear)) return;
    addTaxYear(emptyTaxYear(newYear, household.filingStatus, household.stateOfResidence));
    setDialogOpen(false);
  }, [newYear, taxYears, household, addTaxYear]);

  const sorted = [...taxYears].sort((a, b) => b.taxYear - a.taxYear);
  const documents = useTaxStore((s) => s.documents);

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <Title3>
          <CalendarRegular /> Tax Years
        </Title3>
        <Button appearance="primary" icon={<AddRegular />} onClick={() => setDialogOpen(true)}>
          Add Tax Year
        </Button>
      </div>
      <Card>
        <CardHeader header={<Text weight="semibold">Tax Year Records</Text>} />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHeaderCell>Year</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Federal Tax</TableHeaderCell>
              <TableHeaderCell>State Tax</TableHeaderCell>
              <TableHeaderCell>Documents</TableHeaderCell>
              <TableHeaderCell>Actions</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <Text italic>No tax years added. Click &quot;Add Tax Year&quot; to start tracking.</Text>
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((ty) => (
                <TableRow key={ty.taxYear}>
                  <TableCell>
                    <Text weight="semibold">{ty.taxYear}</Text>
                  </TableCell>
                  <TableCell>
                    <Badge appearance="filled" color={statusColors[ty.status]}>{ty.status}</Badge>
                  </TableCell>
                  <TableCell>{formatCurrency(ty.computedFederalTax)}</TableCell>
                  <TableCell>{formatCurrency(ty.computedStateTax)}</TableCell>
                  <TableCell>{documents.filter((d) => d.taxYear === ty.taxYear).length}</TableCell>
                  <TableCell>
                    <Button
                      appearance="subtle"
                      icon={<OpenRegular />}
                      size="small"
                      aria-label={`Open tax year ${ty.taxYear}`}
                      onClick={() => navigate(`/tax/${ty.taxYear}`)}
                    />
                    <Button
                      appearance="subtle"
                      icon={<DeleteRegular />}
                      size="small"
                      aria-label={`Delete tax year ${ty.taxYear}`}
                      onClick={() => setDeleteYear(ty.taxYear)}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={(_, data) => setDialogOpen(data.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Add Tax Year</DialogTitle>
            <DialogContent>
              <div className={styles.form}>
                <Field label="Tax Year">
                  <Input
                    type="number"
                    value={String(newYear)}
                    onChange={(_, data) => setNewYear(safeParseNumber(data.value, new Date().getFullYear()))}
                  />
                </Field>
                {taxYears.some((ty) => ty.taxYear === newYear) && (
                  <Text className={styles.errorText}>
                    Tax year {newYear} already exists.
                  </Text>
                )}
              </div>
            </DialogContent>
            <DialogActions>
              <DialogTrigger disableButtonEnhancement>
                <Button appearance="secondary">Cancel</Button>
              </DialogTrigger>
              <Button
                appearance="primary"
                onClick={handleAdd}
                disabled={taxYears.some((ty) => ty.taxYear === newYear)}
              >
                Add
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      <Dialog open={deleteYear !== null} onOpenChange={(_, data) => { if (!data.open) setDeleteYear(null); }}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Delete Tax Year</DialogTitle>
            <DialogContent>
              Are you sure you want to delete tax year {deleteYear}? This cannot be undone.
            </DialogContent>
            <DialogActions>
              <DialogTrigger disableButtonEnhancement>
                <Button appearance="secondary">Cancel</Button>
              </DialogTrigger>
              <Button appearance="primary" onClick={() => { removeTaxYear(deleteYear!); setDeleteYear(null); }}>
                Delete
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
}
