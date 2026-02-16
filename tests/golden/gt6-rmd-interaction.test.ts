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
 * Birth year 1952 -> RMD start age 73 -> already in RMD territory.
 *
 * Year 1 RMD walkthrough:
 *   BOY balance after return: 3,000,000 * 1.05 = 3,150,000
 *   ULT divisor for age 74 = 25.5
 *   RMD = 3,150,000 / 25.5 = 123,529.41
 */

/** Tolerance for dollar comparisons */
const TOLERANCE = 5;

function closeTo(actual: number, expected: number, tol = TOLERANCE): boolean {
  return Math.abs(actual - expected) <= tol;
}

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
    survivorSpendingAdjustmentPct: 1.0,
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

    it('should have RMD of approximately $123,529', () => {
      // BOY: 3,000,000 * 1.05 = 3,150,000; divisor 25.5; RMD = 123,529.41
      expect(closeTo(yr1.rmdTotal, 123_529, 2)).toBe(true);
    });

    it('should have RMD exceeding spending target ($80,000)', () => {
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
      // RMD of ~$123,529 is ordinary income. After $15,000 single standard deduction:
      // taxable ordinary = ~$108,529. At 22% effective rate: ~$23,876
      expect(yr1.taxesFederal).toBeGreaterThan(0);
    });

    it('should have taxable ordinary income reflecting RMD in year 1', () => {
      const yr1 = yearly[0];
      // taxableOrdinaryIncome should be RMD minus standard deduction (approximately)
      // RMD ~$123,529 - $15,000 std deduction = ~$108,529
      expect(yr1.taxableOrdinaryIncome).toBeGreaterThan(100_000);
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
      // Compare year 1 vs later years.
      // We check that the RMD/gross-balance ratio at age 74 < ratio at age 84.
      // ULT divisor: age 74 = 25.5 -> 3.92%; age 84 = 16.8 -> 5.95%
      const yr1 = yearly[0];
      const yr11 = yearly[10]; // age 84

      // We can estimate ratios from the rmdTotal relative to endBalance + rmdTotal
      // (approximating BOY balance as endBalance + rmd + fees - returns)
      // Simpler: just check that later RMD percentages are higher
      if (yr11 && yr11.rmdTotal > 0) {
        const balance1 = Object.values(yr1.endBalanceByAccount).reduce((s, v) => s + v, 0);
        const balance11 = Object.values(yr11.endBalanceByAccount).reduce((s, v) => s + v, 0);

        // Approximate BOY balance from endBalance (rough, but directionally correct)
        // The key insight: divisor at age 84 (16.8) < divisor at age 74 (25.5)
        // so rmd/balance ratio must be higher
        const ratio1 = yr1.rmdTotal / (balance1 + yr1.rmdTotal);
        const ratio11 = yr11.rmdTotal / (balance11 + yr11.rmdTotal);

        expect(ratio11).toBeGreaterThan(ratio1);
      }
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
      // The RMD of ~$123,529 should be enough to cover $80,000 spending + taxes.
      // Taxes on ~$123,529 at 22% effective (after deduction) are roughly $23,876.
      // Net from RMD = ~$123,529 - ~$23,876 = ~$99,653 > $80,000 spending.
      // So no discretionary withdrawal from the tax-deferred account should be needed.
      // The withdrawalsByAccount should only reflect the RMD amount (or very close to it).
      const totalWithdrawals = Object.values(yr1.withdrawalsByAccount).reduce(
        (sum, v) => sum + v,
        0
      );
      // Total withdrawals should be close to RMD (no extra discretionary withdrawals needed)
      // The convergence loop may produce a small additional amount, but it should be minimal.
      expect(totalWithdrawals).toBeLessThan(yr1.rmdTotal + 1_000);
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
    it('should report deterministic success probability', () => {
      // If there are no shortfalls, success probability = 1.0
      const hasShortfall = yearly.some(yr => yr.shortfall > 0);
      if (hasShortfall) {
        expect(result.summary.successProbability).toBe(0);
      } else {
        expect(result.summary.successProbability).toBe(1.0);
      }
    });
  });
});
