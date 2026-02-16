import { create } from 'zustand';
import type { SpendingPlan, TaxConfig, MarketConfig, StrategyConfig, PlanResult } from '@finplanner/domain';

interface Scenario {
  id: string;
  name: string;
  spending: SpendingPlan;
  taxes: TaxConfig;
  market: MarketConfig;
  strategy: StrategyConfig;
  result?: PlanResult;
  runAt?: string;
}

interface RetirementState {
  spending: SpendingPlan;
  taxes: TaxConfig;
  market: MarketConfig;
  strategy: StrategyConfig;
  scenarios: Scenario[];
  activeScenarioId: string | null;
  latestResult: PlanResult | null;

  // Actions
  setSpending: (spending: SpendingPlan) => void;
  setTaxes: (taxes: TaxConfig) => void;
  setMarket: (market: MarketConfig) => void;
  setStrategy: (strategy: StrategyConfig) => void;
  addScenario: (scenario: Scenario) => void;
  updateScenario: (id: string, partial: Partial<Scenario>) => void;
  removeScenario: (id: string) => void;
  setActiveScenario: (id: string | null) => void;
  setLatestResult: (result: PlanResult | null) => void;
}

const defaultSpending: SpendingPlan = {
  targetAnnualSpend: 80000,
  inflationPct: 2.5,
  floorAnnualSpend: 60000,
  survivorSpendingAdjustmentPct: 70,
};

const defaultTaxes: TaxConfig = {
  federalModel: 'effective',
  stateModel: 'none',
  federalEffectiveRatePct: 22,
  capGainsRatePct: 15,
};

const defaultMarket: MarketConfig = {
  simulationMode: 'deterministic',
  deterministicReturnPct: 7.0,
  deterministicInflationPct: 2.5,
  monteCarloRuns: 10000,
};

const defaultStrategy: StrategyConfig = {
  withdrawalOrder: 'taxableFirst',
  rebalanceFrequency: 'annual',
  guardrailsEnabled: false,
};

export const useRetirementStore = create<RetirementState>((set) => ({
  spending: defaultSpending,
  taxes: defaultTaxes,
  market: defaultMarket,
  strategy: defaultStrategy,
  scenarios: [],
  activeScenarioId: null,
  latestResult: null,

  setSpending: (spending) => set({ spending }),
  setTaxes: (taxes) => set({ taxes }),
  setMarket: (market) => set({ market }),
  setStrategy: (strategy) => set({ strategy }),
  addScenario: (scenario) =>
    set((state) => ({ scenarios: [...state.scenarios, scenario] })),
  updateScenario: (id, partial) =>
    set((state) => ({
      scenarios: state.scenarios.map((s) => (s.id === id ? { ...s, ...partial } : s)),
    })),
  removeScenario: (id) =>
    set((state) => ({ scenarios: state.scenarios.filter((s) => s.id !== id) })),
  setActiveScenario: (id) => set({ activeScenarioId: id }),
  setLatestResult: (result) => set({ latestResult: result }),
}));
