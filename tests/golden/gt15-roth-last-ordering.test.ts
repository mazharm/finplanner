/**
 * GT15: Roth Withdrawal Ordering
 *
 * Validates that Roth accounts are withdrawn last under the
 * taxableFirst strategy.
 *
 * Fixture: Single retiree, age 62, LE 72 (10-year horizon).
 * Birth year 1964 -> RMD start age 75 (born 1960+), so no RMDs
 * interfere during the 10-year horizon.
 *
 * Three accounts:
 *   - Taxable: $200,000 ($150,000 basis), 5% return, no fees
 *   - TaxDeferred: $200,000, 5% return, no fees
 *   - Roth: $200,000, 5% return, no fees
 * Spending: $50,000/year, 0% inflation (flat for simplicity).
 * Strategy: taxableFirst (order: Taxable -> TaxDeferred -> Roth)
 *
 * With $600,000 total and $50k/year spending, the taxable and
 * taxDeferred accounts should be drawn down before Roth is touched.
 */
import { describe, it, expect } from 'vitest';
import { simulate } from '@finplanner/engine';
import type { PlanInput } from '@finplanner/domain';

const fixture: PlanInput = {
  schemaVersion: '3.0.0',
  household: {
    maritalStatus: 'single',
    filingStatus: 'single',
    stateOfResidence: 'TX',
    primary: {
      id: 'primary',
      birthYear: 1964, // RMD start age = 75 (born 1960+)
      currentAge: 62,
      retirementAge: 62,
      lifeExpectancy: 72,
    },
  },
  accounts: [
    {
      id: 'taxable-1',
      name: 'Brokerage',
      type: 'taxable',
      owner: 'primary',
      currentBalance: 200_000,
      costBasis: 150_000,
      expectedReturnPct: 5,
      feePct: 0,
    },
    {
      id: 'trad-ira-1',
      name: 'Traditional IRA',
      type: 'taxDeferred',
      owner: 'primary',
      currentBalance: 200_000,
      expectedReturnPct: 5,
      feePct: 0,
    },
    {
      id: 'roth-1',
      name: 'Roth IRA',
      type: 'roth',
      owner: 'primary',
      currentBalance: 200_000,
      expectedReturnPct: 5,
      feePct: 0,
    },
  ],
  otherIncome: [],
  adjustments: [],
  spending: {
    targetAnnualSpend: 50_000,
    inflationPct: 0, // flat spending for simplicity
    survivorSpendingAdjustmentPct: 100,
  },
  taxes: {
    federalModel: 'effective',
    stateModel: 'none',
    federalEffectiveRatePct: 15,
    capGainsRatePct: 15,
  },
  market: {
    simulationMode: 'deterministic',
  },
  strategy: {
    withdrawalOrder: 'taxableFirst',
    rebalanceFrequency: 'none',
    guardrailsEnabled: false,
  },
};

describe('GT15: Roth Withdrawal Ordering (taxableFirst)', () => {
  const result = simulate(fixture);
  const yearly = result.yearly;

  it('should produce 10 years of results', () => {
    expect(yearly).toHaveLength(10);
  });

  it('should have zero RMDs throughout (ages 62-71, RMD starts at 75)', () => {
    for (const yr of yearly) {
      expect(yr.rmdTotal).toBe(0);
    }
  });

  it('should withdraw from taxable account first in year 1', () => {
    const yr1TaxableWithdrawal = yearly[0].withdrawalsByAccount['taxable-1'] ?? 0;
    expect(yr1TaxableWithdrawal).toBeGreaterThan(0);
  });

  it('should not withdraw from Roth while taxable has balance', () => {
    for (const yr of yearly) {
      const taxableBalance = yr.endBalanceByAccount['taxable-1'] ?? 0;
      const rothWithdrawal = yr.withdrawalsByAccount['roth-1'] ?? 0;
      if (taxableBalance > 100) {
        expect(rothWithdrawal).toBe(0);
      }
    }
  });

  it('should not withdraw from Roth while taxDeferred has balance', () => {
    for (const yr of yearly) {
      const tradBalance = yr.endBalanceByAccount['trad-ira-1'] ?? 0;
      const rothWithdrawal = yr.withdrawalsByAccount['roth-1'] ?? 0;
      if (tradBalance > 100) {
        expect(rothWithdrawal).toBe(0);
      }
    }
  });

  it('should deplete taxable before taxDeferred, and taxDeferred before Roth', () => {
    // Find when each account is first depleted (balance hits 0)
    let taxableDepleted = -1;
    let tradDepleted = -1;
    let rothDepleted = -1;

    for (let i = 0; i < yearly.length; i++) {
      if (taxableDepleted < 0 && yearly[i].endBalanceByAccount['taxable-1'] <= 0) {
        taxableDepleted = i;
      }
      if (tradDepleted < 0 && yearly[i].endBalanceByAccount['trad-ira-1'] <= 0) {
        tradDepleted = i;
      }
      if (rothDepleted < 0 && yearly[i].endBalanceByAccount['roth-1'] <= 0) {
        rothDepleted = i;
      }
    }

    // Taxable should deplete before taxDeferred
    expect(taxableDepleted).toBeGreaterThanOrEqual(0);
    if (tradDepleted >= 0) {
      expect(taxableDepleted).toBeLessThanOrEqual(tradDepleted);
    }
    // TaxDeferred should deplete before Roth (if either depletes)
    if (tradDepleted >= 0 && rothDepleted >= 0) {
      expect(tradDepleted).toBeLessThanOrEqual(rothDepleted);
    }
  });

  it('should have Roth withdrawals classified as tax-free', () => {
    for (const yr of yearly) {
      if (yr.rothWithdrawals > 0) {
        // Roth withdrawals should not generate taxable ordinary income —
        // taxableOrdinaryIncome should be zero (or near-zero from convergence)
        // since all other account types are depleted when Roth is tapped.
        // The only taxable income when drawing from Roth should be none.
        const taxableFromOtherSources = yr.taxableOrdinaryIncome;
        const taxDeferredWithdrawal = yr.withdrawalsByAccount['trad-ira-1'] ?? 0;
        // If no taxDeferred withdrawal, taxable ordinary income should come only
        // from the standard deduction offset (i.e., be 0 or minimal)
        if (taxDeferredWithdrawal === 0) {
          expect(taxableFromOtherSources).toBeLessThanOrEqual(0);
        }
      }
    }
  });
});
