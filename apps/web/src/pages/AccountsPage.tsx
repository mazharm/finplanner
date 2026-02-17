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
} from '@fluentui/react-components';
import { WalletRegular, AddRegular, DeleteRegular } from '@fluentui/react-icons';
import { useState, useCallback } from 'react';
import { useSharedStore } from '../stores/shared-store.js';
import { safeParseNumber } from '../utils/parse-number.js';
import { formatCurrency } from '../utils/format.js';
import { generateId } from '../utils/id.js';
import type { Account, AccountType } from '@finplanner/domain';

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  form: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM },
  row: { display: 'flex', gap: tokens.spacingHorizontalM },
  balance: { fontWeight: tokens.fontWeightSemibold },
});

const emptyAccount: Omit<Account, 'id'> = {
  name: '',
  type: 'taxable',
  owner: 'primary',
  currentBalance: 0,
  expectedReturnPct: 7,
  feePct: 0.1,
};

export function AccountsPage() {
  const styles = useStyles();
  const accounts = useSharedStore((s) => s.accounts);
  const addAccount = useSharedStore((s) => s.addAccount);
  const removeAccount = useSharedStore((s) => s.removeAccount);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState<Omit<Account, 'id'>>(emptyAccount);
  const [deleteAccountId, setDeleteAccountId] = useState<string | null>(null);
  const deleteAccount = accounts.find((a) => a.id === deleteAccountId);

  const handleAdd = useCallback(() => {
    addAccount({ ...draft, name: draft.name.trim(), id: generateId('acct') });
    setDraft(emptyAccount);
    setDialogOpen(false);
  }, [draft, addAccount]);

  const totalBalance = accounts.reduce((sum, a) => sum + a.currentBalance, 0);

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <Title3>
          <WalletRegular /> Accounts
        </Title3>
        <Button appearance="primary" icon={<AddRegular />} onClick={() => setDialogOpen(true)}>
          Add Account
        </Button>
      </div>
      <Card>
        <CardHeader
          header={<Text weight="semibold">Investment Accounts</Text>}
          description={accounts.length > 0 ? `Total: ${formatCurrency(totalBalance)}` : undefined}
        />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHeaderCell>Name</TableHeaderCell>
              <TableHeaderCell>Type</TableHeaderCell>
              <TableHeaderCell>Owner</TableHeaderCell>
              <TableHeaderCell>Balance</TableHeaderCell>
              <TableHeaderCell>Return %</TableHeaderCell>
              <TableHeaderCell>Fee %</TableHeaderCell>
              <TableHeaderCell>Actions</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <Text italic>No accounts added yet. Click &quot;Add Account&quot; to get started.</Text>
                </TableCell>
              </TableRow>
            ) : (
              accounts.map((acct) => (
                <TableRow key={acct.id}>
                  <TableCell>{acct.name}</TableCell>
                  <TableCell>{acct.type}</TableCell>
                  <TableCell>{acct.owner}</TableCell>
                  <TableCell className={styles.balance}>{formatCurrency(acct.currentBalance)}</TableCell>
                  <TableCell>{acct.expectedReturnPct}%</TableCell>
                  <TableCell>{acct.feePct}%</TableCell>
                  <TableCell>
                    <Button
                      appearance="subtle"
                      icon={<DeleteRegular />}
                      size="small"
                      aria-label={`Delete account ${acct.name}`}
                      onClick={() => setDeleteAccountId(acct.id)}
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
            <DialogTitle>Add Account</DialogTitle>
            <DialogContent>
              <div className={styles.form}>
                <Field label="Account Name" required>
                  <Input
                    value={draft.name}
                    onChange={(_, data) => setDraft((d) => ({ ...d, name: data.value }))}
                    placeholder="e.g., Fidelity 401k"
                  />
                </Field>
                <div className={styles.row}>
                  <Field label="Type">
                    <Select
                      value={draft.type}
                      onChange={(_, data) => setDraft((d) => ({ ...d, type: data.value as AccountType }))}
                    >
                      <option value="taxable">Taxable</option>
                      <option value="taxDeferred">Tax-Deferred (401k/IRA)</option>
                      <option value="roth">Roth</option>
                      <option value="deferredComp">Deferred Comp</option>
                    </Select>
                  </Field>
                  <Field label="Owner">
                    <Select
                      value={draft.owner}
                      onChange={(_, data) =>
                        setDraft((d) => ({ ...d, owner: data.value as Account['owner'] }))
                      }
                    >
                      <option value="primary">Primary</option>
                      <option value="spouse">Spouse</option>
                      <option value="joint">Joint</option>
                    </Select>
                  </Field>
                </div>
                <Field label="Current Balance ($)">
                  <Input
                    type="number"
                    value={String(draft.currentBalance)}
                    onChange={(_, data) => setDraft((d) => ({ ...d, currentBalance: safeParseNumber(data.value) }))}
                  />
                </Field>
                <div className={styles.row}>
                  <Field label="Expected Return (%)">
                    <Input
                      type="number"
                      value={String(draft.expectedReturnPct)}
                      onChange={(_, data) =>
                        setDraft((d) => ({ ...d, expectedReturnPct: safeParseNumber(data.value, 7, -100, 100) }))
                      }
                    />
                  </Field>
                  <Field label="Annual Fee (%)">
                    <Input
                      type="number"
                      value={String(draft.feePct)}
                      onChange={(_, data) => setDraft((d) => ({ ...d, feePct: safeParseNumber(data.value, 0.1, 0, 100) }))}
                    />
                  </Field>
                </div>
              </div>
            </DialogContent>
            <DialogActions>
              <DialogTrigger disableButtonEnhancement>
                <Button appearance="secondary">Cancel</Button>
              </DialogTrigger>
              <Button appearance="primary" onClick={handleAdd} disabled={!draft.name.trim()}>
                Add
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      <Dialog open={deleteAccountId !== null} onOpenChange={(_, data) => { if (!data.open) setDeleteAccountId(null); }}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogContent>
              Are you sure you want to delete account &quot;{deleteAccount?.name}&quot;? This cannot be undone.
            </DialogContent>
            <DialogActions>
              <DialogTrigger disableButtonEnhancement>
                <Button appearance="secondary">Cancel</Button>
              </DialogTrigger>
              <Button appearance="primary" onClick={() => { removeAccount(deleteAccountId!); setDeleteAccountId(null); }}>
                Delete
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
}
