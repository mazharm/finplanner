export interface TaxConfig {
  federalModel: 'effective' | 'bracket';
  stateModel: 'effective' | 'bracket' | 'none';
  federalEffectiveRatePct?: number;
  stateEffectiveRatePct?: number;
  stateCapGainsRatePct?: number;
  capGainsRatePct?: number;
  standardDeductionOverride?: number;
}
