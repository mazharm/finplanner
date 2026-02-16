export const SCENARIO_IDS = [
  'dotcom_bust',
  'gfc_2008',
  'early_drawdown',
  'high_inflation_decade',
  'low_return_regime',
] as const;

export type ScenarioId = (typeof SCENARIO_IDS)[number];
