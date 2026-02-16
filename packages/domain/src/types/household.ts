import type { FilingStatus } from './common.js';

export interface PersonProfile {
  id: 'primary' | 'spouse';
  birthYear: number;
  currentAge: number;
  retirementAge: number;
  lifeExpectancy: number;
  socialSecurity?: {
    claimAge: number;
    piaMonthlyAtFRA?: number;
    estimatedMonthlyBenefitAtClaim: number;
    colaPct: number;
  };
}

export interface HouseholdProfile {
  maritalStatus: 'single' | 'married';
  filingStatus: FilingStatus;
  stateOfResidence: string;
  primary: PersonProfile;
  spouse?: PersonProfile;
}
