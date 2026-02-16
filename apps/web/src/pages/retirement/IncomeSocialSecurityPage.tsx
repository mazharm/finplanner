import {
  makeStyles,
  tokens,
  Card,
  CardHeader,
  Text,
  Title3,
  Button,
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
  Switch,
} from '@fluentui/react-components';
import { MoneyRegular, AddRegular, DeleteRegular } from '@fluentui/react-icons';
import { useState, useCallback } from 'react';
import { useSharedStore } from '../../stores/shared-store.js';
import type { IncomeStream } from '@finplanner/domain';

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  form: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM },
  row: { display: 'flex', gap: tokens.spacingHorizontalM },
});

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

function generateId(): string {
  return `inc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const emptyStream: Omit<IncomeStream, 'id'> = {
  name: '',
  owner: 'primary',
  startYear: new Date().getFullYear(),
  annualAmount: 0,
  taxable: true,
};

export function IncomeSocialSecurityPage() {
  const styles = useStyles();
  const { incomeStreams, addIncomeStream, removeIncomeStream } = useSharedStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState<Omit<IncomeStream, 'id'>>(emptyStream);

  const handleAdd = useCallback(() => {
    addIncomeStream({ ...draft, id: generateId() });
    setDraft(emptyStream);
    setDialogOpen(false);
  }, [draft, addIncomeStream]);

  const totalAnnual = incomeStreams.reduce((sum, s) => sum + s.annualAmount, 0);

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <Title3>
          <MoneyRegular /> Income &amp; Social Security
        </Title3>
        <Button appearance="primary" icon={<AddRegular />} onClick={() => setDialogOpen(true)}>
          Add Income Stream
        </Button>
      </div>
      <Card>
        <CardHeader
          header={<Text weight="semibold">Income Streams</Text>}
          description={incomeStreams.length > 0 ? `Total annual: ${formatCurrency(totalAnnual)}` : undefined}
        />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHeaderCell>Name</TableHeaderCell>
              <TableHeaderCell>Owner</TableHeaderCell>
              <TableHeaderCell>Amount</TableHeaderCell>
              <TableHeaderCell>Start</TableHeaderCell>
              <TableHeaderCell>End</TableHeaderCell>
              <TableHeaderCell>Taxable</TableHeaderCell>
              <TableHeaderCell>Actions</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {incomeStreams.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <Text italic>No income streams configured. Add Social Security, pensions, or other income.</Text>
                </TableCell>
              </TableRow>
            ) : (
              incomeStreams.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.name}</TableCell>
                  <TableCell>{s.owner}</TableCell>
                  <TableCell>{formatCurrency(s.annualAmount)}</TableCell>
                  <TableCell>{s.startYear}</TableCell>
                  <TableCell>{s.endYear ?? '—'}</TableCell>
                  <TableCell>{s.taxable ? 'Yes' : 'No'}</TableCell>
                  <TableCell>
                    <Button
                      appearance="subtle"
                      icon={<DeleteRegular />}
                      size="small"
                      onClick={() => removeIncomeStream(s.id)}
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
            <DialogTitle>Add Income Stream</DialogTitle>
            <DialogContent>
              <div className={styles.form}>
                <Field label="Name" required>
                  <Input
                    value={draft.name}
                    onChange={(_, d) => setDraft((s) => ({ ...s, name: d.value }))}
                    placeholder="e.g., Social Security, Company Pension"
                  />
                </Field>
                <div className={styles.row}>
                  <Field label="Owner">
                    <Select
                      value={draft.owner}
                      onChange={(_, d) => setDraft((s) => ({ ...s, owner: d.value as IncomeStream['owner'] }))}
                    >
                      <option value="primary">Primary</option>
                      <option value="spouse">Spouse</option>
                      <option value="joint">Joint</option>
                    </Select>
                  </Field>
                  <Field label="Annual Amount ($)">
                    <Input
                      type="number"
                      value={String(draft.annualAmount)}
                      onChange={(_, d) => setDraft((s) => ({ ...s, annualAmount: Number(d.value) }))}
                    />
                  </Field>
                </div>
                <div className={styles.row}>
                  <Field label="Start Year">
                    <Input
                      type="number"
                      value={String(draft.startYear)}
                      onChange={(_, d) => setDraft((s) => ({ ...s, startYear: Number(d.value) }))}
                    />
                  </Field>
                  <Field label="End Year (optional)">
                    <Input
                      type="number"
                      value={draft.endYear ? String(draft.endYear) : ''}
                      onChange={(_, d) => setDraft((s) => ({ ...s, endYear: d.value ? Number(d.value) : undefined }))}
                      placeholder="Leave empty for lifetime"
                    />
                  </Field>
                </div>
                <div className={styles.row}>
                  <Switch
                    label="Taxable"
                    checked={draft.taxable}
                    onChange={(_, d) => setDraft((s) => ({ ...s, taxable: d.checked }))}
                  />
                  <Switch
                    label="Continues for Survivor"
                    checked={draft.survivorContinues ?? false}
                    onChange={(_, d) => setDraft((s) => ({ ...s, survivorContinues: d.checked }))}
                  />
                </div>
                <Field label="COLA (%)">
                  <Input
                    type="number"
                    value={String(draft.colaPct ?? 0)}
                    onChange={(_, d) => setDraft((s) => ({ ...s, colaPct: Number(d.value) }))}
                    placeholder="0"
                  />
                </Field>
              </div>
            </DialogContent>
            <DialogActions>
              <DialogTrigger disableButtonEnhancement>
                <Button appearance="secondary">Cancel</Button>
              </DialogTrigger>
              <Button appearance="primary" onClick={handleAdd} disabled={!draft.name}>
                Add
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
}
