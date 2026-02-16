export interface IncomeStream {
  id: string;
  name: string;
  owner: 'primary' | 'spouse' | 'joint';
  startYear: number;
  endYear?: number;
  annualAmount: number;
  colaPct?: number;
  taxable: boolean;
  survivorContinues?: boolean;
}

export interface Adjustment {
  id: string;
  name: string;
  year: number;
  endYear?: number;
  amount: number;
  taxable: boolean;
  inflationAdjusted?: boolean;
}
