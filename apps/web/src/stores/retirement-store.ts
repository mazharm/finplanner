import { create } from 'zustand';
import type { SpendingPlan, TaxConfig, MarketConfig, StrategyConfig, PlanResult } from '@finplanner/domain';
import { getAppState, setAppState } from '../services/indexeddb.js';

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
  initialized: boolean;

  // Lifecycle
  initFromIndexedDB: () => Promise<void>;

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

type PersistableRetirement = Pick<RetirementState, 'spending' | 'taxes' | 'market' | 'strategy' | 'scenarios' | 'activeScenarioId'>;

function persistRetirement(state: PersistableRetirement) {
  setAppState('retirement', {
    spending: state.spending,
    taxes: state.taxes,
    market: state.market,
    strategy: state.strategy,
    scenarios: state.scenarios,
    activeScenarioId: state.activeScenarioId,
  }).catch((err) => {
    console.error('[FinPlanner] IndexedDB operation failed:', err);
  });
}

export const useRetirementStore = create<RetirementState>((set, get) => ({
  spending: defaultSpending,
  taxes: defaultTaxes,
  market: defaultMarket,
  strategy: defaultStrategy,
  scenarios: [],
  activeScenarioId: null,
  latestResult: null,
  initialized: false,

  initFromIndexedDB: async () => {
    try {
      const saved = await getAppState<PersistableRetirement>('retirement');
      if (saved) {
        set({
          spending: saved.spending ?? defaultSpending,
          taxes: saved.taxes ?? defaultTaxes,
          market: saved.market ?? defaultMarket,
          strategy: saved.strategy ?? defaultStrategy,
          scenarios: saved.scenarios ?? [],
          activeScenarioId: saved.activeScenarioId ?? null,
          initialized: true,
        });
      } else {
        set({ initialized: true });
      }
    } catch {
      set({ initialized: true });
    }
  },

  setSpending: (spending) => {
    set({ spending });
    persistRetirement({ ...get(), spending });
  },
  setTaxes: (taxes) => {
    set({ taxes });
    persistRetirement({ ...get(), taxes });
  },
  setMarket: (market) => {
    set({ market });
    persistRetirement({ ...get(), market });
  },
  setStrategy: (strategy) => {
    set({ strategy });
    persistRetirement({ ...get(), strategy });
  },
  addScenario: (scenario) => {
    set((state) => {
      const scenarios = [...state.scenarios, scenario];
      persistRetirement({ ...state, scenarios });
      return { scenarios };
    });
  },
  updateScenario: (id, partial) => {
    set((state) => {
      const scenarios = state.scenarios.map((s) => (s.id === id ? { ...s, ...partial } : s));
      persistRetirement({ ...state, scenarios });
      return { scenarios };
    });
  },
  removeScenario: (id) => {
    set((state) => {
      const scenarios = state.scenarios.filter((s) => s.id !== id);
      persistRetirement({ ...state, scenarios });
      return { scenarios };
    });
  },
  setActiveScenario: (id) => {
    set({ activeScenarioId: id });
    persistRetirement({ ...get(), activeScenarioId: id });
  },
  setLatestResult: (result) => set({ latestResult: result }),
}));
