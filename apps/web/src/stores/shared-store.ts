import { create } from 'zustand';
import type { HouseholdProfile, Account, IncomeStream, Adjustment, FilingStatus } from '@finplanner/domain';

interface SharedState {
  household: HouseholdProfile;
  accounts: Account[];
  incomeStreams: IncomeStream[];
  adjustments: Adjustment[];

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

export const useSharedStore = create<SharedState>((set) => ({
  household: defaultHousehold,
  accounts: [],
  incomeStreams: [],
  adjustments: [],

  setHousehold: (household) => set({ household }),
  updateHousehold: (partial) =>
    set((state) => ({ household: { ...state.household, ...partial } })),

  addAccount: (account) =>
    set((state) => ({ accounts: [...state.accounts, account] })),
  updateAccount: (id, partial) =>
    set((state) => ({
      accounts: state.accounts.map((a) => (a.id === id ? { ...a, ...partial } : a)),
    })),
  removeAccount: (id) =>
    set((state) => ({ accounts: state.accounts.filter((a) => a.id !== id) })),

  addIncomeStream: (stream) =>
    set((state) => ({ incomeStreams: [...state.incomeStreams, stream] })),
  updateIncomeStream: (id, partial) =>
    set((state) => ({
      incomeStreams: state.incomeStreams.map((s) =>
        s.id === id ? { ...s, ...partial } : s,
      ),
    })),
  removeIncomeStream: (id) =>
    set((state) => ({ incomeStreams: state.incomeStreams.filter((s) => s.id !== id) })),

  addAdjustment: (adj) =>
    set((state) => ({ adjustments: [...state.adjustments, adj] })),
  updateAdjustment: (id, partial) =>
    set((state) => ({
      adjustments: state.adjustments.map((a) =>
        a.id === id ? { ...a, ...partial } : a,
      ),
    })),
  removeAdjustment: (id) =>
    set((state) => ({ adjustments: state.adjustments.filter((a) => a.id !== id) })),
}));
