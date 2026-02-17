export interface TaxComputationConfig {
  federalEffectiveRatePct: number;
  capGainsRatePct: number;
  stateEffectiveRatePct?: number;
  stateCapGainsRatePct?: number;
  ssTaxExempt?: boolean;
  stateStandardDeduction?: number;
  stateCapGainsThreshold?: number;
  stateCapGainsExcludesQualDivs?: boolean;
}

export interface TaxComputationResult {
  federalTax: number;
  stateTax: number;
  totalTax: number;
  effectiveFederalRate: number;
  effectiveStateRate: number;
  refundOrBalanceDueFederal: number;
  refundOrBalanceDueState: number;
}
