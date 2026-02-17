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
} from '@fluentui/react-components';
import { PlayRegular, AddRegular, DeleteRegular } from '@fluentui/react-icons';
import { useState, useCallback } from 'react';
import { useRetirementStore } from '../../stores/retirement-store.js';
import { formatCurrency } from '../../utils/format.js';
import { generateId } from '../../utils/id.js';

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  form: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM },
});

export function ScenariosPage() {
  const styles = useStyles();
  const { spending, taxes, market, strategy, scenarios, addScenario, removeScenario, setActiveScenario } = useRetirementStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [scenarioName, setScenarioName] = useState('');
  const [deleteScenarioId, setDeleteScenarioId] = useState<string | null>(null);
  const deleteScenario = scenarios.find((s) => s.id === deleteScenarioId);

  const handleCreate = useCallback(() => {
    addScenario({
      id: generateId('scen'),
      name: scenarioName || `Scenario ${scenarios.length + 1}`,
      spending: { ...spending },
      taxes: { ...taxes },
      market: { ...market },
      strategy: { ...strategy },
    });
    setScenarioName('');
    setDialogOpen(false);
  }, [scenarioName, spending, taxes, market, strategy, scenarios.length, addScenario]);

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <Title3>
          <PlayRegular /> Scenarios
        </Title3>
        <Button appearance="primary" icon={<AddRegular />} onClick={() => setDialogOpen(true)}>
          New Scenario
        </Button>
      </div>
      <Text>
        Create what-if scenarios to compare different retirement strategies.
        Each scenario captures a snapshot of your current plan setup, assumptions, and strategy.
      </Text>
      <Card>
        <CardHeader header={<Text weight="semibold">Scenario Comparison</Text>} />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHeaderCell>Scenario</TableHeaderCell>
              <TableHeaderCell>Spending</TableHeaderCell>
              <TableHeaderCell>Withdrawal</TableHeaderCell>
              <TableHeaderCell>Mode</TableHeaderCell>
              <TableHeaderCell>Success %</TableHeaderCell>
              <TableHeaderCell>Median Terminal</TableHeaderCell>
              <TableHeaderCell>Actions</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {scenarios.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <Text italic>No scenarios created. Click &quot;New Scenario&quot; to snapshot and compare strategies.</Text>
                </TableCell>
              </TableRow>
            ) : (
              scenarios.map((scen) => (
                <TableRow key={scen.id}>
                  <TableCell>
                    <Text weight="semibold">{scen.name}</Text>
                  </TableCell>
                  <TableCell>{formatCurrency(scen.spending.targetAnnualSpend)}/yr</TableCell>
                  <TableCell>{scen.strategy.withdrawalOrder}</TableCell>
                  <TableCell>
                    <Badge appearance="outline">{scen.market.simulationMode}</Badge>
                  </TableCell>
                  <TableCell>
                    {scen.result
                      ? `${((scen.result.summary.successProbability ?? 0) * 100).toFixed(0)}%`
                      : '—'}
                  </TableCell>
                  <TableCell>
                    {scen.result
                      ? formatCurrency(scen.result.summary.medianTerminalValue ?? 0)
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <Button
                      appearance="subtle"
                      size="small"
                      onClick={() => setActiveScenario(scen.id)}
                    >
                      Select
                    </Button>
                    <Button
                      appearance="subtle"
                      icon={<DeleteRegular />}
                      size="small"
                      aria-label={`Delete scenario ${scen.name}`}
                      onClick={() => setDeleteScenarioId(scen.id)}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={deleteScenarioId !== null} onOpenChange={(_, data) => { if (!data.open) setDeleteScenarioId(null); }}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Delete Scenario</DialogTitle>
            <DialogContent>
              Are you sure you want to delete scenario &quot;{deleteScenario?.name}&quot;? This cannot be undone.
            </DialogContent>
            <DialogActions>
              <DialogTrigger disableButtonEnhancement>
                <Button appearance="secondary">Cancel</Button>
              </DialogTrigger>
              <Button appearance="primary" onClick={() => { removeScenario(deleteScenarioId!); setDeleteScenarioId(null); }}>
                Delete
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={(_, data) => setDialogOpen(data.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Create Scenario</DialogTitle>
            <DialogContent>
              <div className={styles.form}>
                <Field label="Scenario Name">
                  <Input
                    value={scenarioName}
                    onChange={(_, d) => setScenarioName(d.value)}
                    placeholder={`Scenario ${scenarios.length + 1}`}
                  />
                </Field>
                <Text size={200}>
                  This will snapshot your current plan setup, assumptions, and strategy.
                </Text>
              </div>
            </DialogContent>
            <DialogActions>
              <DialogTrigger disableButtonEnhancement>
                <Button appearance="secondary">Cancel</Button>
              </DialogTrigger>
              <Button appearance="primary" onClick={handleCreate}>
                Create
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
}
