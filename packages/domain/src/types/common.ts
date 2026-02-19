export type FilingStatus = 'single' | 'mfj' | 'mfs' | 'hoh' | 'survivor';
export type AccountType = 'taxable' | 'taxDeferred' | 'deferredComp' | 'roth';
export type SimulationMode = 'deterministic' | 'historical' | 'stress' | 'monteCarlo';
export type TaxYearStatus = 'draft' | 'ready' | 'filed' | 'amended';
export type ChecklistItemStatus = 'pending' | 'received' | 'not_applicable' | 'waived';
export type AnomalySeverity = 'info' | 'warning' | 'critical';
export type TaxFormType = 'W-2' | '1099-INT' | '1099-DIV' | '1099-R' | '1099-B' | '1099-MISC' | '1099-NEC' | 'K-1' | '1098' | '1098-T' | '1098-E' | 'other';
export type NdjsonRecordType = 'header' | 'household' | 'account' | 'incomeStream' | 'adjustment' | 'appConfig' | 'taxYear' | 'taxDocument' | 'checklistItem' | 'anomaly' | 'retirementPlan' | 'simulationResult';
