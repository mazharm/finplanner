import { create } from 'zustand';
import type { HouseholdProfile, Account, IncomeStream, Adjustment, FilingStatus } from '@finplanner/domain';
import { getAppState, setAppState } from '../services/indexeddb.js';

interface SharedState {
  household: HouseholdProfile;
  accounts: Account[];
  incomeStreams: IncomeStream[];
  adjustments: Adjustment[];
  initialized: boolean;
  persistError: string | null;

  // Lifecycle
  initFromIndexedDB: () => Promise<void>;
  clearPersistError: () => void;

  // Household actions
  setHousehold: (household: HouseholdProfile) => void;
  updateHousehold: (partial: Partial<HouseholdProfile>) => void;

  // Account actions
  addAccount: (account: Account) => void;
  updateAccount: (id: string, partial: Partial<Account>) => void;
  removeAccount: (id: string) => void;

  // Income stream actions
  addIncomeStream: (stream: IncomeStream) => void;
  updateIncomeStream: (id: string, partial: Partial<IncomeStream>) => void;
  removeIncomeStream: (id: string) => void;

  // Adjustment actions
  addAdjustment: (adj: Adjustment) => void;
  updateAdjustment: (id: string, partial: Partial<Adjustment>) => void;
  removeAdjustment: (id: string) => void;
}

const defaultHousehold: HouseholdProfile = {
  maritalStatus: 'single',
  filingStatus: 'single' as FilingStatus,
  stateOfResidence: 'WA',
  primary: {
    id: 'primary',
    birthYear: 1990,
    currentAge: 35,
    retirementAge: 65,
    lifeExpectancy: 90,
  },
};

// Module-level reference to store setter, populated on store creation
let _setShared: ((partial: Partial<SharedState>) => void) | null = null;

function persistShared(state: Pick<SharedState, 'household' | 'accounts' | 'incomeStreams' | 'adjustments'>) {
  setAppState('shared', {
    household: state.household,
    accounts: state.accounts,
    incomeStreams: state.incomeStreams,
    adjustments: state.adjustments,
  }).catch((err) => {
    console.error('[FinPlanner] IndexedDB operation failed:', err);
    _setShared?.({ persistError: 'Failed to save data. Changes may be lost on page refresh.' });
  });
}

function isValidHousehold(h: unknown): h is HouseholdProfile {
  return h !== null && typeof h === 'object' && 'primary' in h && 'stateOfResidence' in h;
}

export const useSharedStore = create<SharedState>((set, get) => {
  _setShared = set;
  return {
  household: defaultHousehold,
  accounts: [],
  incomeStreams: [],
  adjustments: [],
  initialized: false,
  persistError: null,

  clearPersistError: () => set({ persistError: null }),

  initFromIndexedDB: async () => {
    try {
      const saved = await getAppState<{
        household: HouseholdProfile;
        accounts: Account[];
        incomeStreams: IncomeStream[];
        adjustments: Adjustment[];
      }>('shared');
      if (saved) {
        set({
          household: isValidHousehold(saved.household) ? saved.household : defaultHousehold,
          accounts: Array.isArray(saved.accounts) ? saved.accounts : [],
          incomeStreams: Array.isArray(saved.incomeStreams) ? saved.incomeStreams : [],
          adjustments: Array.isArray(saved.adjustments) ? saved.adjustments : [],
          initialized: true,
        });
      } else {
        set({ initialized: true });
      }
    } catch {
      set({ initialized: true });
    }
  },

  setHousehold: (household) => {
    set({ household });
    persistShared({ ...get(), household });
  },
  updateHousehold: (partial) => {
    set((state) => {
      const household = { ...state.household, ...partial };
      persistShared({ ...state, household });
      return { household };
    });
  },

  addAccount: (account) => {
    set((state) => {
      const accounts = [...state.accounts, account];
      persistShared({ ...state, accounts });
      return { accounts };
    });
  },
  updateAccount: (id, partial) => {
    set((state) => {
      const accounts = state.accounts.map((a) => (a.id === id ? { ...a, ...partial } : a));
      persistShared({ ...state, accounts });
      return { accounts };
    });
  },
  removeAccount: (id) => {
    set((state) => {
      const accounts = state.accounts.filter((a) => a.id !== id);
      persistShared({ ...state, accounts });
      return { accounts };
    });
  },

  addIncomeStream: (stream) => {
    set((state) => {
      const incomeStreams = [...state.incomeStreams, stream];
      persistShared({ ...state, incomeStreams });
      return { incomeStreams };
    });
  },
  updateIncomeStream: (id, partial) => {
    set((state) => {
      const incomeStreams = state.incomeStreams.map((s) =>
        s.id === id ? { ...s, ...partial } : s,
      );
      persistShared({ ...state, incomeStreams });
      return { incomeStreams };
    });
  },
  removeIncomeStream: (id) => {
    set((state) => {
      const incomeStreams = state.incomeStreams.filter((s) => s.id !== id);
      persistShared({ ...state, incomeStreams });
      return { incomeStreams };
    });
  },

  addAdjustment: (adj) => {
    set((state) => {
      const adjustments = [...state.adjustments, adj];
      persistShared({ ...state, adjustments });
      return { adjustments };
    });
  },
  updateAdjustment: (id, partial) => {
    set((state) => {
      const adjustments = state.adjustments.map((a) =>
        a.id === id ? { ...a, ...partial } : a,
      );
      persistShared({ ...state, adjustments });
      return { adjustments };
    });
  },
  removeAdjustment: (id) => {
    set((state) => {
      const adjustments = state.adjustments.filter((a) => a.id !== id);
      persistShared({ ...state, adjustments });
      return { adjustments };
    });
  },
};
});
