/**
 * GT4: High-Tax vs Low-Tax State Comparison
 *
 * Two simulation runs with identical inputs except the state of residence
 * and state tax configuration. Validates that state taxes have the expected
 * directional impact on portfolio outcomes.
 *
 * Run A: California (CA), 9.3% state effective rate
 * Run B: Washington (WA), stateModel: 'none' (no state income tax)
 *
 * Fixture (shared):
 * - Single retiree, age 62, LE 92 (30-year horizon)
 * - Tax-deferred account: $1,500,000, 5.5% return, 0.15% fee
 * - Spending: $80,000/year, 2% inflation, survivorSpendingAdjustmentPct: 1.0
 * - Taxes: 22% federal effective, 15% cap gains
 * - Strategy: taxOptimized, no rebalancing, no guardrails
 * - Birth year: 2026 - 62 = 1964
 *
 * NOTE: Both portfolios deplete before year 30. CA depletes around year 20,
 * WA around year 23. The key comparison is that WA lasts longer (fewer
 * shortfall-only years) and pays less total tax.
 */
import { describe, it, expect } from 'vitest';
import { simulate } from '@finplanner/engine';
import type { PlanInput } from '@finplanner/domain';

const TOLERANCE = 50;

function withinTolerance(actual: number, expected: number): void {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(TOLERANCE);
}

function makeFixture(
  state: string,
  stateModel: 'effective' | 'none',
  stateEffectiveRatePct?: number
): PlanInput {
  return {
    schemaVersion: '3.0.0',
    household: {
      maritalStatus: 'single',
      filingStatus: 'single',
      stateOfResidence: state,
      primary: {
        id: 'primary',
        birthYear: 1964, // 2026 - 62
        currentAge: 62,
        retirementAge: 62,
        lifeExpectancy: 92,
      },
    },
    accounts: [
      {
        id: 'trad-401k',
        name: '401(k) Rollover IRA',
        type: 'taxDeferred',
        owner: 'primary',
        currentBalance: 1_500_000,
        expectedReturnPct: 5.5,
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
      stateModel,
      federalEffectiveRatePct: 22,
      capGainsRatePct: 15,
      ...(stateEffectiveRatePct !== undefined ? { stateEffectiveRatePct } : {}),
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
}

const fixtureCA = makeFixture('CA', 'effective', 9.3);
const fixtureWA = makeFixture('WA', 'none');

describe('GT4: High-Tax vs Low-Tax State Comparison', () => {
  const resultCA = simulate(fixtureCA);
  const resultWA = simulate(fixtureWA);

  describe('Simulation horizon', () => {
    it('should produce 30 years for both runs', () => {
      expect(resultCA.yearly).toHaveLength(30);
      expect(resultWA.yearly).toHaveLength(30);
    });
  });

  describe('Identical spending targets', () => {
    it('should have identical targetSpend sequences for both runs', () => {
      for (let i = 0; i < resultCA.yearly.length; i++) {
        withinTolerance(resultCA.yearly[i].targetSpend, resultWA.yearly[i].targetSpend);
      }
    });

    it('should have year 1 target = $80,000 for both runs', () => {
      withinTolerance(resultCA.yearly[0].targetSpend, 80_000);
      withinTolerance(resultWA.yearly[0].targetSpend, 80_000);
    });
  });

  describe('Tax differentials', () => {
    it('Run A (CA) should have state taxes > 0 in early years with significant withdrawals', () => {
      // Check years 1-10 where withdrawals are well above the standard deduction
      for (let i = 0; i < 10; i++) {
        const yr = resultCA.yearly[i];
        const totalWithdrawn = Object.values(yr.withdrawalsByAccount)
          .reduce((sum, v) => sum + v, 0);
        if (totalWithdrawn > 50_000) {
          expect(yr.taxesState).toBeGreaterThan(0);
        }
      }
    });

    it('Run B (WA) should have state taxes = 0 for all years', () => {
      for (const yr of resultWA.yearly) {
        expect(yr.taxesState).toBe(0);
      }
    });

    it('Run B total taxes should be less than Run A total taxes', () => {
      const totalTaxesCA = resultCA.yearly.reduce(
        (sum, yr) => sum + yr.taxesFederal + yr.taxesState,
        0
      );
      const totalTaxesWA = resultWA.yearly.reduce(
        (sum, yr) => sum + yr.taxesFederal + yr.taxesState,
        0
      );
      expect(totalTaxesWA).toBeLessThan(totalTaxesCA);
    });

    it('tax differential should be substantial (> $50,000 cumulative)', () => {
      const totalTaxesCA = resultCA.yearly.reduce(
        (sum, yr) => sum + yr.taxesFederal + yr.taxesState,
        0
      );
      const totalTaxesWA = resultWA.yearly.reduce(
        (sum, yr) => sum + yr.taxesFederal + yr.taxesState,
        0
      );
      expect(totalTaxesCA - totalTaxesWA).toBeGreaterThan(50_000);
    });
  });

  describe('Portfolio longevity', () => {
    function findDepletionYear(yearly: typeof resultCA.yearly): number {
      for (let i = 0; i < yearly.length; i++) {
        const bal = Object.values(yearly[i].endBalanceByAccount)
          .reduce((sum, v) => sum + v, 0);
        if (bal <= 0) return i + 1;
      }
      return yearly.length + 1; // never depleted
    }

    it('Run B (WA) should deplete later than Run A (CA)', () => {
      const depletionCA = findDepletionYear(resultCA.yearly);
      const depletionWA = findDepletionYear(resultWA.yearly);
      expect(depletionWA).toBeGreaterThan(depletionCA);
    });

    it('Run B (WA) should have fewer or equal shortfall years than Run A (CA)', () => {
      const shortfallCA = resultCA.yearly.filter(yr => yr.shortfall > 0).length;
      const shortfallWA = resultWA.yearly.filter(yr => yr.shortfall > 0).length;
      expect(shortfallWA).toBeLessThanOrEqual(shortfallCA);
    });
  });

  describe('Year-by-year comparisons', () => {
    it('Run B (WA) should have higher end balance than Run A (CA) each year', () => {
      for (let i = 0; i < resultCA.yearly.length; i++) {
        const balCA = Object.values(resultCA.yearly[i].endBalanceByAccount)
          .reduce((sum, v) => sum + v, 0);
        const balWA = Object.values(resultWA.yearly[i].endBalanceByAccount)
          .reduce((sum, v) => sum + v, 0);
        // WA should be >= CA in every year (lower taxes = less drain)
        expect(balWA).toBeGreaterThanOrEqual(balCA - TOLERANCE);
      }
    });

    it('Run A (CA) should require larger gross withdrawals in early years', () => {
      // In year 1, CA needs to withdraw more to cover state taxes
      const yr1CA = resultCA.yearly[0];
      const yr1WA = resultWA.yearly[0];
      const totalCashCA = Object.values(yr1CA.withdrawalsByAccount)
        .reduce((sum, v) => sum + v, 0) + yr1CA.rmdTotal;
      const totalCashWA = Object.values(yr1WA.withdrawalsByAccount)
        .reduce((sum, v) => sum + v, 0) + yr1WA.rmdTotal;
      expect(totalCashCA).toBeGreaterThan(totalCashWA);
    });
  });

  describe('Federal taxes comparison', () => {
    it('both runs should have identical federal effective rates configured', () => {
      expect(resultCA.assumptionsUsed.federalEffectiveRatePct).toBe(22);
      expect(resultWA.assumptionsUsed.federalEffectiveRatePct).toBe(22);
    });
  });

  describe('RMD behavior', () => {
    it('should have zero RMD before age 75 (born 1964)', () => {
      // Born 1964 -> RMD start age = 75
      // Age 75 = yearIndex 13 (62 + 13 = 75)
      for (let i = 0; i < 13; i++) {
        expect(resultCA.yearly[i].rmdTotal).toBe(0);
        expect(resultWA.yearly[i].rmdTotal).toBe(0);
      }
    });

    it('should have non-zero RMD from age 75 onward (while balance > 0)', () => {
      // yearIndex 13 -> age 75
      // CA may be depleted by year 20, WA by year 23
      // Check the first year of RMDs for both
      const yr14CA = resultCA.yearly[13];
      const yr14WA = resultWA.yearly[13];
      const balCA = Object.values(yr14CA.endBalanceByAccount).reduce((s,v)=>s+v,0);
      const balWA = Object.values(yr14WA.endBalanceByAccount).reduce((s,v)=>s+v,0);

      if (balCA > 0) {
        expect(yr14CA.rmdTotal).toBeGreaterThan(0);
      }
      expect(yr14WA.rmdTotal).toBeGreaterThan(0);
      expect(balWA).toBeGreaterThan(0);
    });
  });

  describe('Structural invariants for both runs', () => {
    for (const [label, result] of [
      ['Run A (CA)', resultCA],
      ['Run B (WA)', resultWA],
    ] as const) {
      describe(label, () => {
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

        it('should have zero social security income (none configured)', () => {
          for (const yr of result.yearly) {
            expect(yr.socialSecurityIncome).toBe(0);
          }
        });

        it('should have zero capital gains (taxDeferred only)', () => {
          for (const yr of result.yearly) {
            expect(yr.taxableCapitalGains).toBe(0);
          }
        });

        it('should have zero Roth withdrawals', () => {
          for (const yr of result.yearly) {
            expect(yr.rothWithdrawals).toBe(0);
          }
        });
      });
    }
  });
});
