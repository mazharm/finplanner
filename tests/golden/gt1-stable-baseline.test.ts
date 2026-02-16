/**
 * GT1: Stable Baseline Market Case
 *
 * Single retiree, age 65, life expectancy 90 (25-year horizon).
 * One taxable account: $1,000,000 balance, $600,000 cost basis,
 * 6% return, 0.10% fee.
 * Spending: $50,000/year, 2% inflation, survivorSpendingAdjustmentPct: 1.0.
 * Taxes: 12% federal effective, 0% state (stateModel: 'none'), 15% cap gains.
 * No SS, no pensions, no adjustments.
 * Strategy: taxableFirst, no rebalancing, no guardrails.
 *
 * This is the simplest golden test: a single taxable account with
 * deterministic returns. The convergence loop resolves near-algebraically
 * because the only tax is on capital gains (no ordinary income).
 *
 * NOTE: The engine's convergence loop (threshold: $100, max 5 iterations)
 * introduces small residual shortfalls of approximately $20-$45/year.
 * Reference values are pinned to the engine's actual output with a
 * tolerance of $50 to accommodate this convergence behavior.
 */
import { describe, it, expect } from 'vitest';
import { simulate } from '@finplanner/engine';
import type { PlanInput } from '@finplanner/domain';

/** Tolerance for year-by-year reference value comparisons. */
const TOLERANCE = 50;
/** Maximum acceptable per-year shortfall due to convergence residual. */
const MAX_CONVERGENCE_SHORTFALL = 50;

function withinTolerance(actual: number, expected: number): void {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(TOLERANCE);
}

const gt1Fixture: PlanInput = {
  schemaVersion: '3.0.0',
  household: {
    maritalStatus: 'single',
    filingStatus: 'single',
    stateOfResidence: 'TX', // no state income tax
    primary: {
      id: 'primary',
      birthYear: 1961, // 2026 - 65
      currentAge: 65,
      retirementAge: 65,
      lifeExpectancy: 90,
    },
  },
  accounts: [
    {
      id: 'taxable-1',
      name: 'Brokerage Account',
      type: 'taxable',
      owner: 'primary',
      currentBalance: 1_000_000,
      costBasis: 600_000,
      expectedReturnPct: 6,
      feePct: 0.10,
    },
  ],
  otherIncome: [],
  adjustments: [],
  spending: {
    targetAnnualSpend: 50_000,
    inflationPct: 2,
    survivorSpendingAdjustmentPct: 1.0,
  },
  taxes: {
    federalModel: 'effective',
    stateModel: 'none',
    federalEffectiveRatePct: 12,
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

/**
 * Reference values for years 1-5, pinned to engine output.
 *
 * These values include the convergence residual (small shortfalls ~$25-$30/yr).
 * The engine's withdrawal solver iterates until estimated and actual taxes
 * converge within $100, which produces slightly under-withdrawn amounts.
 */
const referenceData = [
  { year: 1, age: 65, targetSpend: 50_000, grossWithdrawal: 53_450, capGains: 23_195, tax: 3_479, endBalance: 1_005_543, basis: 569_745 },
  { year: 2, age: 66, targetSpend: 51_000, grossWithdrawal: 54_804, capGains: 25_509, tax: 3_826, endBalance: 1_010_061, basis: 540_451 },
  { year: 3, age: 67, targetSpend: 52_020, grossWithdrawal: 56_168, capGains: 27_816, tax: 4_172, endBalance: 1_013_482, basis: 512_098 },
  { year: 4, age: 68, targetSpend: 53_060, grossWithdrawal: 57_553, capGains: 30_118, tax: 4_518, endBalance: 1_015_721, basis: 484_664 },
  { year: 5, age: 69, targetSpend: 54_122, grossWithdrawal: 58_958, capGains: 32_418, tax: 4_863, endBalance: 1_016_689, basis: 458_123 },
];

describe('GT1: Stable Baseline Market Case', () => {
  const result = simulate(gt1Fixture);

  it('should produce exactly 25 yearly results', () => {
    expect(result.yearly).toHaveLength(25);
  });

  it('should have near-zero shortfall across all 25 years (convergence residual only)', () => {
    for (const yr of result.yearly) {
      expect(yr.shortfall).toBeLessThan(MAX_CONVERGENCE_SHORTFALL);
    }
  });

  it('should have total shortfall < $1,200 across all 25 years', () => {
    const totalShortfall = result.yearly.reduce((s, yr) => s + yr.shortfall, 0);
    expect(totalShortfall).toBeLessThan(1_200);
  });

  it('should have year 1 spending target = $50,000', () => {
    withinTolerance(result.yearly[0].targetSpend, 50_000);
  });

  it('should have year 25 spending target ~$80,422', () => {
    // 50000 * (1.02)^24 = 50000 * 1.608437... = ~80421.87
    withinTolerance(result.yearly[24].targetSpend, 80_422);
  });

  it('should have end-of-year-1 balance ~$1,005,543', () => {
    const eoyBalance = Object.values(result.yearly[0].endBalanceByAccount)
      .reduce((sum, v) => sum + v, 0);
    withinTolerance(eoyBalance, 1_005_543);
  });

  it('should have final year end balance > $0', () => {
    const finalBalance = Object.values(result.yearly[24].endBalanceByAccount)
      .reduce((sum, v) => sum + v, 0);
    expect(finalBalance).toBeGreaterThan(0);
  });

  it('should have total taxes paid over 25 years > $0', () => {
    const totalTaxes = result.yearly.reduce(
      (sum, yr) => sum + yr.taxesFederal + yr.taxesState,
      0
    );
    expect(totalTaxes).toBeGreaterThan(0);
  });

  it('should have cost basis decreasing monotonically year over year', () => {
    for (let i = 1; i < result.yearly.length; i++) {
      const prevBasis = result.yearly[i - 1].costBasisByAccount?.['taxable-1'] ?? 0;
      const currBasis = result.yearly[i].costBasisByAccount?.['taxable-1'] ?? 0;
      expect(currBasis).toBeLessThanOrEqual(prevBasis + TOLERANCE);
    }
  });

  describe('Year-by-year reference values (years 1-5)', () => {
    for (const ref of referenceData) {
      const yearIdx = ref.year - 1;

      describe(`Year ${ref.year} (age ${ref.age})`, () => {
        it(`should have age = ${ref.age}`, () => {
          expect(result.yearly[yearIdx].agePrimary).toBe(ref.age);
        });

        it(`should have targetSpend ~$${ref.targetSpend.toLocaleString()}`, () => {
          withinTolerance(result.yearly[yearIdx].targetSpend, ref.targetSpend);
        });

        it(`should have gross withdrawal ~$${ref.grossWithdrawal.toLocaleString()}`, () => {
          const totalWithdrawn = Object.values(result.yearly[yearIdx].withdrawalsByAccount)
            .reduce((sum, v) => sum + v, 0);
          withinTolerance(totalWithdrawn, ref.grossWithdrawal);
        });

        it(`should have capital gains ~$${ref.capGains.toLocaleString()}`, () => {
          withinTolerance(result.yearly[yearIdx].taxableCapitalGains, ref.capGains);
        });

        it(`should have tax ~$${ref.tax.toLocaleString()}`, () => {
          const totalTax = result.yearly[yearIdx].taxesFederal + result.yearly[yearIdx].taxesState;
          withinTolerance(totalTax, ref.tax);
        });

        it(`should have end balance ~$${ref.endBalance.toLocaleString()}`, () => {
          const eoy = result.yearly[yearIdx].endBalanceByAccount['taxable-1'] ?? 0;
          withinTolerance(eoy, ref.endBalance);
        });

        it(`should have cost basis ~$${ref.basis.toLocaleString()}`, () => {
          const basis = result.yearly[yearIdx].costBasisByAccount?.['taxable-1'] ?? 0;
          withinTolerance(basis, ref.basis);
        });
      });
    }
  });

  describe('Structural invariants', () => {
    it('should have isSurvivorPhase = false for all years', () => {
      for (const yr of result.yearly) {
        expect(yr.isSurvivorPhase).toBe(false);
      }
    });

    it('should have filingStatus = single for all years', () => {
      for (const yr of result.yearly) {
        expect(yr.filingStatus).toBe('single');
      }
    });

    it('should have zero social security income for all years', () => {
      for (const yr of result.yearly) {
        expect(yr.socialSecurityIncome).toBe(0);
      }
    });

    it('should have zero RMD for all years (taxable account, no RMD)', () => {
      for (const yr of result.yearly) {
        expect(yr.rmdTotal).toBe(0);
      }
    });

    it('should have zero state taxes for all years', () => {
      for (const yr of result.yearly) {
        expect(yr.taxesState).toBe(0);
      }
    });

    it('should have actualSpend equal to targetSpend (no guardrails)', () => {
      for (const yr of result.yearly) {
        withinTolerance(yr.actualSpend, yr.targetSpend);
      }
    });
  });
});
