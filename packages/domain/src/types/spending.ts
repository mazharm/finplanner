export interface SpendingPlan {
  targetAnnualSpend: number;
  inflationPct: number;
  floorAnnualSpend?: number;
  ceilingAnnualSpend?: number;
  survivorSpendingAdjustmentPct: number;
}
