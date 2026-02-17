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
  incomeRate: number;
  capitalGainsRate: number;
  ssTaxExempt: 'yes' | 'no' | 'partial';
  stateStandardDeduction?: number;
  capitalGainsThreshold?: number;
  capitalGainsExcludesQualDivs?: boolean;
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
