import type { TaxDocument, TaxYearRecord, HouseholdProfile, Account, IncomeStream } from '@finplanner/domain';

export interface ChecklistRequest {
  taxYear: number;
  currentYearRecord: TaxYearRecord;
  priorYearRecord?: TaxYearRecord;
  priorYearDocuments: TaxDocument[];
  currentYearDocuments: TaxDocument[];
  sharedCorpus: {
    household: HouseholdProfile;
    accounts: Account[];
    incomeStreams: IncomeStream[];
  };
}
