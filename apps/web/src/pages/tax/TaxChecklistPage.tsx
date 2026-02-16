import {
  makeStyles,
  tokens,
  Card,
  CardHeader,
  Text,
  Title3,
  Field,
  Select,
  Badge,
  Table,
  TableHeader,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  ProgressBar,
} from '@fluentui/react-components';
import { ClipboardTaskListLtrRegular } from '@fluentui/react-icons';
import { useState, useMemo } from 'react';
import { useTaxStore } from '../../stores/tax-store.js';
import type { ChecklistItemStatus } from '@finplanner/domain';

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL },
  controls: { display: 'flex', gap: tokens.spacingHorizontalM, alignItems: 'flex-end' },
  progress: { display: 'flex', gap: tokens.spacingHorizontalM, alignItems: 'center' },
});

const statusColors: Record<ChecklistItemStatus, 'success' | 'warning' | 'informative' | 'subtle'> = {
  received: 'success',
  pending: 'warning',
  not_applicable: 'informative',
  waived: 'subtle',
};

export function TaxChecklistPage() {
  const styles = useStyles();
  const { taxYears, checklistItems, updateChecklistItem } = useTaxStore();
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  const yearItems = useMemo(
    () => (selectedYear ? checklistItems.filter((ci) => ci.taxYear === selectedYear) : []),
    [selectedYear, checklistItems],
  );

  const completedCount = yearItems.filter((ci) => ci.status === 'received' || ci.status === 'not_applicable' || ci.status === 'waived').length;
  const completionPct = yearItems.length > 0 ? completedCount / yearItems.length : 0;

  return (
    <div className={styles.root}>
      <Title3>
        <ClipboardTaskListLtrRegular /> Tax Filing Checklist
      </Title3>
      <div className={styles.controls}>
        <Field label="Tax Year">
          <Select
            value={selectedYear ? String(selectedYear) : ''}
            onChange={(_, data) => setSelectedYear(data.value ? Number(data.value) : null)}
          >
            <option value="">Select a tax year...</option>
            {taxYears.map((ty) => (
              <option key={ty.taxYear} value={String(ty.taxYear)}>{ty.taxYear}</option>
            ))}
          </Select>
        </Field>
      </div>
      {selectedYear && (
        <>
          <div className={styles.progress}>
            <ProgressBar value={completionPct} style={{ flex: 1 }} />
            <Text weight="semibold">{(completionPct * 100).toFixed(0)}%</Text>
            <Text size={200}>({completedCount}/{yearItems.length} items)</Text>
          </div>
          <Card>
            <CardHeader header={<Text weight="semibold">Checklist Items — {selectedYear}</Text>} />
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHeaderCell>Category</TableHeaderCell>
                  <TableHeaderCell>Description</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Action</TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {yearItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <Text italic>
                        No checklist items for {selectedYear}. Import documents or configure tax year data to generate a checklist.
                      </Text>
                    </TableCell>
                  </TableRow>
                ) : (
                  yearItems.map((ci) => (
                    <TableRow key={ci.id}>
                      <TableCell><Badge appearance="outline">{ci.category}</Badge></TableCell>
                      <TableCell>{ci.description}</TableCell>
                      <TableCell>
                        <Badge appearance="filled" color={statusColors[ci.status]}>{ci.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={ci.status}
                          onChange={(_, data) => updateChecklistItem(ci.id, { status: data.value as ChecklistItemStatus })}
                          style={{ minWidth: '130px' }}
                        >
                          <option value="pending">Pending</option>
                          <option value="received">Received</option>
                          <option value="not_applicable">N/A</option>
                          <option value="waived">Waived</option>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
      {!selectedYear && (
        <Card>
          <CardHeader header={<Text weight="semibold">Checklist Items</Text>} />
          <Text italic style={{ padding: tokens.spacingVerticalL, textAlign: 'center' }}>
            Select a tax year to view its filing checklist.
          </Text>
        </Card>
      )}
    </div>
  );
}
