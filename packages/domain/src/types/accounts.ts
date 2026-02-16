import type { AccountType } from './common.js';

export interface DeferredCompSchedule {
  startYear: number;
  endYear: number;
  frequency: 'annual' | 'monthly';
  amount: number;
  inflationAdjusted: boolean;
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  owner: 'primary' | 'spouse' | 'joint';
  currentBalance: number;
  costBasis?: number;
  expectedReturnPct: number;
  volatilityPct?: number;
  feePct: number;
  targetAllocationPct?: number;
  deferredCompSchedule?: DeferredCompSchedule;
}
