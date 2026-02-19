export interface HistoricalScenario {
  id: string;
  name: string;
  startYear: number;
  endYear: number;
  returns: number[];
  inflation?: number[];
}

export interface StateEntry {
  stateCode: string;
  stateName: string;
  /** Top marginal income tax rate (%). Used as default when no brackets apply. */
  incomeRate: number;
  capitalGainsRate: number;
  ssTaxExempt: 'yes' | 'no' | 'partial';
  stateStandardDeduction?: number;
  capitalGainsThreshold?: number;
  capitalGainsExcludesQualDivs?: boolean;
  /**
   * Progressive tax brackets for states with graduated rates.
   * Each entry is [upperBound, marginalRate%]. The last entry's upperBound is Infinity.
   * When present, the engine/tax computation should use these instead of the flat incomeRate.
   */
  brackets?: readonly (readonly [number, number])[];
  notes?: string;
}

export interface RmdEntry {
  age: number;
  distributionPeriod: number;
}

export interface RmdTable {
  source: string;
  entries: RmdEntry[];
}

export interface StandardDeductions {
  single: number;
  mfj: number;
  survivor: number;
  extraSingle65Plus: number;
  extraMfj65PlusPerPerson: number;
}
