import type { AnonymizedPortfolioContext, AnonymizedTaxContext } from './types.js';

const PORTFOLIO_RESPONSE_SCHEMA = `{
  "recommendations": [
    {
      "title": "string",
      "rationale": "string",
      "expectedImpact": "string",
      "tradeoffs": ["string"],
      "source": "llm"
    }
  ],
  "withdrawalStrategyAdvice": [
    { "title": "string", "rationale": "string" }
  ],
  "riskFlags": ["string"],
  "assumptionSensitivity": ["string"],
  "disclaimer": "string"
}`;

const TAX_RESPONSE_SCHEMA = `{
  "recommendations": [
    {
      "title": "string",
      "rationale": "string",
      "expectedImpact": "string",
      "tradeoffs": ["string"],
      "source": "llm"
    }
  ],
  "taxOptimizationOpportunities": [
    { "title": "string", "rationale": "string" }
  ],
  "riskFlags": ["string"],
  "disclaimer": "string"
}`;

function safeFormat(value: number | undefined | null): string {
  if (value === undefined || value === null) return 'N/A';
  if (!Number.isFinite(value)) return 'N/A'; // Handles NaN, Infinity, -Infinity
  return value.toLocaleString();
}

export function buildPortfolioPrompt(ctx: AnonymizedPortfolioContext): { system: string; user: string } {
  const system = `You are a financial planning advisor assistant. Analyze the provided retirement portfolio data and provide actionable advice.

Respond ONLY with valid JSON matching this exact schema:
${PORTFOLIO_RESPONSE_SCHEMA}

Requirements:
- Provide 3-5 actionable recommendations with clear rationale and expected impact
- Include withdrawal strategy advice tailored to the account types present
- Flag any risks based on the portfolio composition and simulation results
- Note assumption sensitivities that could significantly change outcomes
- Set "source" to "llm" on all recommendations
- Always include a disclaimer stating this is AI-generated guidance, not personalized financial advice, and to consult a qualified financial advisor

Do not include any text outside the JSON object.`;

  const user = `Portfolio Analysis Request:

Household:
- Filing Status: <value>${ctx.household.filingStatus}</value>
- State: <value>${ctx.household.stateOfResidence}</value>
- Primary: Age ${ctx.household.primary.currentAge}, Retirement Age ${ctx.household.primary.retirementAge}, Life Expectancy ${ctx.household.primary.lifeExpectancy}${
    ctx.household.spouse
      ? `\n- Spouse: Age ${ctx.household.spouse.currentAge}, Retirement Age ${ctx.household.spouse.retirementAge}, Life Expectancy ${ctx.household.spouse.lifeExpectancy}`
      : ''
  }

Accounts:
${ctx.accounts.map((a) => `- <value>${a.label}</value> (${a.type}, ${a.owner}): Balance $${safeFormat(a.currentBalance)}, Return ${a.expectedReturnPct}%, Fee ${a.feePct}%`).join('\n')}

Income Streams:
${ctx.incomeStreams.map((s) => `- <value>${s.label}</value> (${s.owner}): $${safeFormat(s.annualAmount)}/yr, Years ${s.startYear}${s.endYear ? `-${s.endYear}` : '+'}, Taxable: ${s.taxable}`).join('\n')}

Tax Configuration:
- Federal Model: ${ctx.taxes.federalModel}${ctx.taxes.federalEffectiveRatePct != null ? ` (${ctx.taxes.federalEffectiveRatePct}%)` : ''}
- State Model: ${ctx.taxes.stateModel}${ctx.taxes.stateEffectiveRatePct != null ? ` (${ctx.taxes.stateEffectiveRatePct}%)` : ''}${ctx.taxes.capGainsRatePct != null ? `\n- Capital Gains Rate: ${ctx.taxes.capGainsRatePct}%` : ''}

Simulation Summary:
${ctx.simulationSummary.successProbability != null ? `- Success Probability: ${(ctx.simulationSummary.successProbability * 100).toFixed(1)}%` : '- Success Probability: N/A'}
${ctx.simulationSummary.medianTerminalValue != null ? `- Median Terminal Value: $${safeFormat(ctx.simulationSummary.medianTerminalValue)}` : '- Median Terminal Value: N/A'}
${ctx.simulationSummary.worstCaseShortfall != null ? `- Worst Case Shortfall: $${safeFormat(ctx.simulationSummary.worstCaseShortfall)}` : '- Worst Case Shortfall: N/A'}

User Preferences:
- Risk Tolerance: <value>${ctx.userPreferences.riskTolerance}</value>
- Spending Floor: $${safeFormat(ctx.userPreferences.spendingFloor)}/yr
- Legacy Goal: $${safeFormat(ctx.userPreferences.legacyGoal)}`;

  return { system, user };
}

export function buildTaxPrompt(ctx: AnonymizedTaxContext): { system: string; user: string } {
  const system = `You are a tax planning advisor assistant. Analyze the provided tax year data and provide actionable tax strategy advice.

Respond ONLY with valid JSON matching this exact schema:
${TAX_RESPONSE_SCHEMA}

Requirements:
- Provide actionable recommendations for tax optimization
- Identify tax optimization opportunities based on the data
- Flag any risks or concerns
- Set "source" to "llm" on all recommendations
- Always include a disclaimer stating this is AI-generated guidance, not personalized tax advice, and to consult a qualified tax professional

Do not include any text outside the JSON object.`;

  const user = `Tax Strategy Analysis Request:

Tax Year: ${ctx.taxYear}
Filing Status: <value>${ctx.filingStatus}</value>
State: <value>${ctx.stateOfResidence}</value>

Income:
- Wages: $${safeFormat(ctx.income.wages)}
- Self-Employment: $${safeFormat(ctx.income.selfEmploymentIncome)}
- Interest: $${safeFormat(ctx.income.interestIncome)}
- Dividends: $${safeFormat(ctx.income.dividendIncome)} (Qualified: $${safeFormat(ctx.income.qualifiedDividends)})
- Capital Gains: $${safeFormat(ctx.income.capitalGains)}, Losses: $${safeFormat(ctx.income.capitalLosses)}
- Rental: $${safeFormat(ctx.income.rentalIncome)}
- NQDC Distributions: $${safeFormat(ctx.income.nqdcDistributions)}
- Retirement Distributions: $${safeFormat(ctx.income.retirementDistributions)}
- Social Security: $${safeFormat(ctx.income.socialSecurityIncome)}
- Other: $${safeFormat(ctx.income.otherIncome)}

Deductions:
- Standard Deduction: $${safeFormat(ctx.deductions.standardDeduction)}
- Using Itemized: ${ctx.deductions.useItemized}${
    ctx.deductions.itemizedDeductions
      ? `\n- Mortgage Interest: $${safeFormat(ctx.deductions.itemizedDeductions.mortgageInterest)}
- State & Local Taxes: $${safeFormat(ctx.deductions.itemizedDeductions.stateAndLocalTaxes)}
- Charitable: $${safeFormat(ctx.deductions.itemizedDeductions.charitableContributions)}
- Medical: $${safeFormat(ctx.deductions.itemizedDeductions.medicalExpenses)}`
      : ''
  }

Credits:
- Child Tax Credit: $${safeFormat(ctx.credits.childTaxCredit)}
- Education: $${safeFormat(ctx.credits.educationCredits)}
- Foreign Tax: $${safeFormat(ctx.credits.foreignTaxCredit)}
- Other: $${safeFormat(ctx.credits.otherCredits)}

Payments:
- Federal Withheld: $${safeFormat(ctx.payments.federalWithheld)}
- State Withheld: $${safeFormat(ctx.payments.stateWithheld)}
- Estimated Federal: $${safeFormat(ctx.payments.estimatedPaymentsFederal)}
- Estimated State: $${safeFormat(ctx.payments.estimatedPaymentsState)}

Computed Tax:
- Federal: $${safeFormat(ctx.computedFederalTax)}
- State: $${safeFormat(ctx.computedStateTax)}${
    ctx.priorYear
      ? `

Prior Year (${ctx.priorYear.taxYear}):
- Total Income: $${safeFormat(Object.values(ctx.priorYear.income).reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0))}
- Federal Tax: $${safeFormat(ctx.priorYear.computedFederalTax)}
- State Tax: $${safeFormat(ctx.priorYear.computedStateTax)}`
      : ''
  }${
    ctx.documents.length > 0
      ? `

Documents:
${ctx.documents.map((d) => `- ${d.label} (${d.formType})`).join('\n')}`
      : ''
  }

Accounts:
${ctx.accounts.map((a) => `- ${a.label} (${a.type}): $${safeFormat(a.currentBalance)}`).join('\n')}

User Priority: <value>${ctx.userPreferences.prioritize}</value>`;

  return { system, user };
}
