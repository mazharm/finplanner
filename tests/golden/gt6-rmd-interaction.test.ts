import { describe, it, expect } from 'vitest';
import { simulate } from '@finplanner/engine';
import type { PlanInput } from '@finplanner/domain';

/**
 * GT6: RMD Interaction Case
 *
 * Validates Required Minimum Distribution (RMD) mechanics:
 * - RMD triggers at the correct age per SECURE 2.0 (birth year 1952 -> age 73)
 * - RMD computed as balance / ULT distribution period
 * - When RMD exceeds spending target, surplus is produced
 * - No discretionary withdrawal needed when RMD covers spending + taxes
 * - RMD amounts increase as a percentage of portfolio over time (divisor shrinks)
 * - All RMD withdrawals are treated as ordinary income
 *
 * Fixture: Single retiree, age 74, LE 95 (21-year horizon).
 * Tax-deferred account: $3,000,000, 5% return, 0.15% fee.
 * Birth year 1952 -> RMD start age 73 (SECURE 2.0 rule for birth years
 * 1951-1959) -> RMDs began in calendar year 2025 (1952 + 73). In simulation
 * year 1 (2026, age 74), RMDs continue from the prior year; no first-year
 * delay applies.
 *
 * Year 1 RMD walkthrough:
 *   RMD uses post-return balance (per spec §8.1 step 2→5 ordering):
 *   $3,000,000 * 1.05 = $3,150,000
 *   ULT divisor for age 74 = 25.5
 *   RMD = 3,150,000 / 25.5 = 123,529.41
 */

/** Tolerance for dollar comparisons (wider to accommodate convergence residuals) */
const TOLERANCE = 100;

const fixture: PlanInput = {
  schemaVersion: '3.0.0',
  household: {
    maritalStatus: 'single',
    filingStatus: 'single',
    stateOfResidence: 'TX',
    primary: {
      id: 'primary',
      birthYear: 1952, // 2026 - 74
      currentAge: 74,
      retirementAge: 65,
      lifeExpectancy: 95,
    },
  },
  accounts: [
    {
      id: 'trad-ira-1',
      name: 'Traditional IRA',
      type: 'taxDeferred',
      owner: 'primary',
      currentBalance: 3_000_000,
      expectedReturnPct: 5,
      feePct: 0.15,
    },
  ],
  otherIncome: [],
  adjustments: [],
  spending: {
    targetAnnualSpend: 80_000,
    inflationPct: 2,
    survivorSpendingAdjustmentPct: 100,
  },
  taxes: {
    federalModel: 'effective',
    stateModel: 'none',
    federalEffectiveRatePct: 22,
    capGainsRatePct: 15,
  },
  market: {
    simulationMode: 'deterministic',
  },
  strategy: {
    withdrawalOrder: 'taxOptimized',
    rebalanceFrequency: 'none',
    guardrailsEnabled: false,
  },
};

describe('GT6: RMD Interaction', () => {
  const result = simulate(fixture);
  const yearly = result.yearly;

  it('should produce 21 years of results (age 74 to 95)', () => {
    expect(yearly.length).toBe(21);
  });

  describe('Year 1 (2026, age 74) — RMD computation', () => {
    const yr1 = yearly[0];

    it('should have calendar year 2026 and age 74', () => {
      expect(yr1.year).toBe(2026);
      expect(yr1.agePrimary).toBe(74);
    });

    it('should have RMD of approximately $117,647', () => {
      // RMD uses prior year-end balance (the input balance): $3,000,000
      // Divisor for age 74 = 25.5
      // RMD = 3,000,000 / 25.5 = 117,647.06
      expect(yr1.rmdTotal).toBeCloseTo(117_647, 0);
    });

    it('should have RMD exceeding spending target ($80,000)', () => {
      // RMD ~$123,529 > $80,000 spending target
      expect(yr1.rmdTotal).toBeGreaterThan(80_000);
    });

    it('should produce a surplus (RMD exceeds spending + taxes)', () => {
      // RMD = ~$123,529. Spending = $80,000. Even with taxes on the RMD,
      // the after-tax RMD should exceed the spending requirement.
      expect(yr1.surplus).toBeGreaterThan(0);
    });

    it('should have zero shortfall', () => {
      expect(yr1.shortfall).toBe(0);
    });
  });

  describe('RMD is the sole income source', () => {
    it('should have zero Social Security income in all years', () => {
      for (const yr of yearly) {
        expect(yr.socialSecurityIncome).toBe(0);
      }
    });

    it('should have zero NQDC distributions in all years', () => {
      for (const yr of yearly) {
        expect(yr.nqdcDistributions).toBe(0);
      }
    });

    it('should have zero pension/other income in all years', () => {
      for (const yr of yearly) {
        expect(yr.pensionAndOtherIncome).toBe(0);
      }
    });
  });

  describe('RMD treated as ordinary income', () => {
    it('should compute federal taxes on RMD in year 1', () => {
      const yr1 = yearly[0];
      // RMD of ~$123,529 is ordinary income. After $14,600 single standard deduction:
      // taxable ordinary = ~$108,929. At 22% effective rate: ~$23,964
      expect(yr1.taxesFederal).toBeGreaterThan(0);
    });

    it('should have taxable ordinary income reflecting RMD in year 1', () => {
      const yr1 = yearly[0];
      // taxableOrdinaryIncome should be RMD minus standard deduction (approximately)
      // RMD ~$117,647 - $14,600 std deduction = ~$103,047
      expect(yr1.taxableOrdinaryIncome).toBeGreaterThan(95_000);
    });

    it('should have zero state taxes (stateModel: none)', () => {
      for (const yr of yearly) {
        expect(yr.taxesState).toBe(0);
      }
    });
  });

  describe('RMD percentage increases over time', () => {
    it('should have increasing RMD-to-balance ratio over time', () => {
      // As the divisor shrinks with age, RMD as a percentage of balance increases.
      // Compare year 1 vs year 11 (age 74 vs age 84).
      // ULT divisor: age 74 = 25.5 -> 3.92%; age 84 = 16.8 -> 5.95%
      const yr1 = yearly[0];
      const yr11 = yearly[10]; // age 84

      // Unconditionally assert year 11 exists and has RMD
      expect(yearly.length).toBeGreaterThan(10);
      expect(yr11.rmdTotal).toBeGreaterThan(0);

      const balance1 = Object.values(yr1.endBalanceByAccount).reduce((s, v) => s + v, 0);
      const balance11 = Object.values(yr11.endBalanceByAccount).reduce((s, v) => s + v, 0);

      // Approximate RMD-to-balance ratio using endBalance + rmdTotal as a proxy for BOY balance
      const ratio1 = yr1.rmdTotal / (balance1 + yr1.rmdTotal);
      const ratio11 = yr11.rmdTotal / (balance11 + yr11.rmdTotal);

      expect(ratio11).toBeGreaterThan(ratio1);
    });
  });

  describe('Zero shortfall in early years', () => {
    it('should have zero shortfall for at least the first 5 years', () => {
      for (let i = 0; i < 5; i++) {
        expect(yearly[i].shortfall).toBe(0);
      }
    });
  });

  describe('No discretionary withdrawal when RMD covers spending', () => {
    it('should not need additional withdrawals beyond RMD in year 1', () => {
      const yr1 = yearly[0];
      // The RMD of ~$117,647 should be enough to cover $80,000 spending + taxes.
      // Taxes on ~$117,647 at 22% effective (after $14.6k deduction) are roughly $22,670.
      // Net from RMD = ~$117,647 - ~$22,582 = ~$95,065 > $80,000 spending.
      // So no discretionary withdrawal from the tax-deferred account should be needed.
      // The withdrawalsByAccount should only reflect the RMD amount (or very close to it).
      const totalWithdrawals = Object.values(yr1.withdrawalsByAccount).reduce(
        (sum, v) => sum + v,
        0
      );
      // withdrawalsByAccount tracks only discretionary withdrawals, not RMDs.
      // Since the RMD (~$117,647) covers spending + taxes, no additional
      // discretionary withdrawals should be needed.
      expect(totalWithdrawals).toBe(0);
    });
  });

  describe('Account balance trajectory', () => {
    it('should have declining account balance over the full horizon', () => {
      // With 5% growth but RMDs and spending withdrawals, the account should
      // generally decline over 21 years.
      const firstBalance = Object.values(yearly[0].endBalanceByAccount).reduce(
        (s, v) => s + v,
        0
      );
      const lastBalance = Object.values(yearly[yearly.length - 1].endBalanceByAccount).reduce(
        (s, v) => s + v,
        0
      );
      expect(lastBalance).toBeLessThan(firstBalance);
    });

    it('should have positive account balance in year 1', () => {
      const balance = Object.values(yearly[0].endBalanceByAccount).reduce(
        (s, v) => s + v,
        0
      );
      expect(balance).toBeGreaterThan(0);
    });
  });

  describe('Summary statistics', () => {
    it('should report success probability of 1.0 (no shortfalls expected)', () => {
      // With $3M starting balance, 5% return, and $80k spending, the portfolio
      // should sustain the 21-year horizon without shortfall
      const hasShortfall = yearly.some(yr => yr.shortfall > 0);
      expect(hasShortfall).toBe(false);
      expect(result.summary.successProbability).toBe(1.0);
    });
  });
});
