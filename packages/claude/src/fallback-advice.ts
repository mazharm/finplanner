import type { PortfolioAdviceRequest, PortfolioAdviceResponse, TaxStrategyAdviceRequest, TaxStrategyAdviceResponse } from '@finplanner/domain';

const FALLBACK_DISCLAIMER = 'This is rule-based guidance, not personalized financial advice. Consult a qualified financial advisor.';
const TAX_FALLBACK_DISCLAIMER = 'This is rule-based guidance, not personalized tax advice. Consult a qualified tax professional.';

export function getPortfolioFallbackAdvice(request: PortfolioAdviceRequest): PortfolioAdviceResponse {
  const { planInput, planResultSummary, userPreferences } = request;
  const recommendations: PortfolioAdviceResponse['recommendations'] = [];
  const withdrawalStrategyAdvice: PortfolioAdviceResponse['withdrawalStrategyAdvice'] = [];
  const riskFlags: string[] = [];

  // Rule 1: Shortfall flag
  if (planResultSummary.worstCaseShortfall != null && planResultSummary.worstCaseShortfall > 0) {
    recommendations.push({
      title: 'Address Potential Shortfall',
      rationale: 'Consider reducing spending target or delaying retirement',
      expectedImpact: 'Reduces risk of running out of funds in worst-case scenarios',
      tradeoffs: ['Lower current spending', 'Later retirement date'],
      source: 'fallback',
    });
  }

  // Rule 2: 4% rule flag
  const totalBalance = planInput.accounts.reduce((sum, a) => sum + a.currentBalance, 0);
  if (totalBalance * 0.04 < userPreferences.spendingFloor) {
    recommendations.push({
      title: 'Spending Floor Exceeds 4% Rule',
      rationale: 'Current savings may not support desired spending at 4% withdrawal rate',
      expectedImpact: 'May need to accumulate more savings or reduce spending floor',
      tradeoffs: ['Increase savings', 'Reduce spending expectations'],
      source: 'fallback',
    });
  }

  // Rule 3: Tax-optimized withdrawal ordering
  const hasTaxDeferred = planInput.accounts.some((a) => a.type === 'taxDeferred' || a.type === 'deferredComp');
  const hasRoth = planInput.accounts.some((a) => a.type === 'roth');
  if (hasTaxDeferred && hasRoth) {
    recommendations.push({
      title: 'Tax-Optimized Withdrawal Ordering',
      rationale: 'Consider tax-optimized withdrawal ordering (taxable → tax-deferred → Roth)',
      expectedImpact: 'May reduce lifetime tax burden and extend portfolio longevity',
      tradeoffs: ['Requires annual review as tax brackets change', 'Less flexible than pro-rata'],
      source: 'fallback',
    });
    withdrawalStrategyAdvice.push({
      title: 'Withdrawal Sequencing',
      rationale: 'With both tax-deferred and Roth accounts, withdrawing from taxable accounts first preserves tax-advantaged growth.',
    });
  }

  // Rule 4: Stress scenario reminder (always)
  recommendations.push({
    title: 'Review Stress Scenarios',
    rationale: 'Review historical stress scenarios to understand downside risk',
    expectedImpact: 'Better preparedness for adverse market conditions',
    tradeoffs: ['May suggest more conservative allocation'],
    source: 'fallback',
  });

  // Rule 5: Risk tolerance mismatch
  const equityHeavyAccounts = planInput.accounts.filter((a) => a.expectedReturnPct > 8);
  const yearsToRetirement = planInput.household.primary.retirementAge - planInput.household.primary.currentAge;
  if (
    userPreferences.riskTolerance === 'aggressive' &&
    equityHeavyAccounts.length > 0 &&
    yearsToRetirement < 5
  ) {
    riskFlags.push(
      'Aggressive risk tolerance with high-return assumptions and short time horizon may expose portfolio to significant sequence-of-returns risk.',
    );
  }

  return {
    recommendations,
    withdrawalStrategyAdvice,
    riskFlags,
    assumptionSensitivity: [
      'Results are sensitive to assumed rates of return and inflation.',
      'Social Security benefit estimates may change based on future legislation.',
    ],
    disclaimer: FALLBACK_DISCLAIMER,
  };
}

export function getTaxFallbackAdvice(request: TaxStrategyAdviceRequest): TaxStrategyAdviceResponse {
  const { taxYearRecord, sharedCorpus } = request;
  const recommendations: TaxStrategyAdviceResponse['recommendations'] = [];
  const taxOptimizationOpportunities: TaxStrategyAdviceResponse['taxOptimizationOpportunities'] = [];
  const riskFlags: string[] = [];

  // Rule 1: Pending checklist items — generic reminder
  recommendations.push({
    title: 'Review Tax Documents',
    rationale: 'Review pending tax documents before filing',
    expectedImpact: 'Ensures all income and deductions are accurately reported',
    tradeoffs: ['Requires time to gather and verify documents'],
    source: 'fallback',
  });

  // Rule 2: Critical anomalies — generic reminder
  recommendations.push({
    title: 'Check Income Anomalies',
    rationale: 'Address flagged income anomalies',
    expectedImpact: 'Prevents potential filing errors or audit triggers',
    tradeoffs: ['May require contacting employers or financial institutions'],
    source: 'fallback',
  });

  // Rule 3: Estimated payment adequacy
  const totalFederalPaid =
    taxYearRecord.payments.federalWithheld + taxYearRecord.payments.estimatedPaymentsFederal;
  if (totalFederalPaid < taxYearRecord.computedFederalTax * 0.9) {
    recommendations.push({
      title: 'Federal Payment Shortfall',
      rationale: 'May owe additional federal tax; consider estimated payments',
      expectedImpact: `Potential underpayment of $${(taxYearRecord.computedFederalTax - totalFederalPaid).toLocaleString()}`,
      tradeoffs: ['Requires cash flow for estimated payments', 'May incur underpayment penalty'],
      source: 'fallback',
    });
  }

  // Rule 4: Filing status optimization
  if (sharedCorpus.household.maritalStatus === 'married') {
    taxOptimizationOpportunities.push({
      title: 'Filing Status Comparison',
      rationale: 'Verify MFJ vs MFS comparison',
    });
  }

  return {
    recommendations,
    taxOptimizationOpportunities,
    riskFlags,
    disclaimer: TAX_FALLBACK_DISCLAIMER,
  };
}
