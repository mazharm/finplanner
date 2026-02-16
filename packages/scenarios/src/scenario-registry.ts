import type { HistoricalScenario } from '@finplanner/domain';

import dotcomBust from '../../../data/historical-returns/dotcom_bust.json';
import gfc2008 from '../../../data/historical-returns/gfc_2008.json';
import earlyDrawdown from '../../../data/historical-returns/early_drawdown.json';
import highInflationDecade from '../../../data/historical-returns/high_inflation_decade.json';
import lowReturnRegime from '../../../data/historical-returns/low_return_regime.json';

const scenarios: Record<string, HistoricalScenario> = {
  dotcom_bust: dotcomBust as HistoricalScenario,
  gfc_2008: gfc2008 as HistoricalScenario,
  early_drawdown: earlyDrawdown as HistoricalScenario,
  high_inflation_decade: highInflationDecade as HistoricalScenario,
  low_return_regime: lowReturnRegime as HistoricalScenario,
};

export function loadScenario(id: string): HistoricalScenario | undefined {
  return scenarios[id];
}

export function getAllScenarios(): HistoricalScenario[] {
  return Object.values(scenarios);
}

export function getScenarioIds(): string[] {
  return Object.keys(scenarios);
}
