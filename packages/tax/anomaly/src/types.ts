import type { TaxYearRecord, TaxDocument, Anomaly } from '@finplanner/domain';

export interface AnomalyDetectionRequest {
  currentYear: number;
  records: TaxYearRecord[];
  documentsByYear: Map<number, TaxDocument[]>;
  thresholdPct?: number;
  thresholdAbsolute?: number;
}

export interface AnomalyDetectionResult {
  taxYear: number;
  comparisonYear: number;
  anomalies: Anomaly[];
  yearOverYearSummary: {
    totalIncomeChange: number;
    totalDeductionChange: number;
    effectiveRateChange: number;
    flagCount: { info: number; warning: number; critical: number };
  };
}
