import { describe, it, expect } from 'vitest';
import { simulate } from '@finplanner/engine';
import type { PlanInput } from '@finplanner/domain';

/**
 * GT7: Guardrail Spending Case
 *
 * Validates guardrail spending rules:
 * - Ceiling trigger: portfolio > 20 * ceiling (inflation-adjusted) -> cap spending at ceiling
 * - Floor trigger: withdrawal rate > 6% of portfolio -> clamp spending down
 * - actualSpend differs from targetSpend when guardrails are triggered
 * - All actualSpend values stay within [floor, ceiling] (inflation-adjusted)
 * - Control run (guardrails disabled): actualSpend == targetSpend every year
 *
 * Fixture: Single retiree, age 65, LE 90 (25-year horizon).
 * Taxable account: $2,000,000 ($1,200,000 basis), 7% return, 0.10% fee.
 * Spending: target $100k, floor $70k, ceiling $130k, 2% inflation.
 *
 * With 7% returns and ~5% effective withdrawal rate, the portfolio grows
 * slowly but the inflated target eventually exceeds 6% withdrawal rate
 * in later years, triggering the floor guardrail (spending clamped down).
 *
 * The ceiling threshold (20 * $130k = $2.6M) is never reached because
 * the starting portfolio of $2M, while growing at 7%, has withdrawals
 * that keep the balance well below the inflating ceiling threshold.
 */

/** Tolerance for dollar comparisons */
const TOLERANCE = 5;

function closeTo(actual: number, expected: number, tol = TOLERANCE): boolean {
  return Math.abs(actual - expected) <= tol;
}

const baseFixture: PlanInput = {
  schemaVersion: '3.0.0',
  household: {
    maritalStatus: 'single',
    filingStatus: 'single',
    stateOfResidence: 'TX',
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
      currentBalance: 2_000_000,
      costBasis: 1_200_000,
      expectedReturnPct: 7,
      feePct: 0.10,
    },
  ],
  otherIncome: [],
  adjustments: [],
  spending: {
    targetAnnualSpend: 100_000,
    inflationPct: 2,
    floorAnnualSpend: 70_000,
    ceilingAnnualSpend: 130_000,
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
    guardrailsEnabled: true,
  },
};

/**
 * Control fixture: identical except guardrails are disabled.
 */
const controlFixture: PlanInput = {
  ...baseFixture,
  strategy: {
    ...baseFixture.strategy,
    guardrailsEnabled: false,
  },
};

describe('GT7: Guardrail Spending', () => {
  const guardrailResult = simulate(baseFixture);
  const guardrailYearly = guardrailResult.yearly;

  const controlResult = simulate(controlFixture);
  const controlYearly = controlResult.yearly;

  it('should produce 25 years of results (age 65 to 90)', () => {
    expect(guardrailYearly.length).toBe(25);
    expect(controlYearly.length).toBe(25);
  });

  describe('Basic fixture properties', () => {
    it('should have calendar year 2026 and age 65 in year 1', () => {
      expect(guardrailYearly[0].year).toBe(2026);
      expect(guardrailYearly[0].agePrimary).toBe(65);
    });

    it('should have zero state taxes (stateModel: none)', () => {
      for (const yr of guardrailYearly) {
        expect(yr.taxesState).toBe(0);
      }
    });
  });

  describe('Floor guardrail triggers in later years', () => {
    it('should have at least one year where actualSpend < targetSpend due to floor guardrail', () => {
      // As the inflated target grows faster than 6% of a slowly growing portfolio,
      // the withdrawal rate exceeds 6%, triggering the floor guardrail which
      // clamps spending down.
      const floorTriggered = guardrailYearly.some(
        (yr) => yr.actualSpend < yr.targetSpend - TOLERANCE
      );
      expect(floorTriggered).toBe(true);
    });

    it('should trigger guardrails only in later years (not in the first 20 years)', () => {
      // Early years: portfolio is large enough that withdrawal rate < 6%
      for (let i = 0; i < 20; i++) {
        const yr = guardrailYearly[i];
        expect(closeTo(yr.actualSpend, yr.targetSpend)).toBe(true);
      }
    });

    it('should have reduced spending in at least one of the last 5 years', () => {
      let reducedCount = 0;
      for (let i = 20; i < guardrailYearly.length; i++) {
        const yr = guardrailYearly[i];
        if (yr.actualSpend < yr.targetSpend - TOLERANCE) {
          reducedCount++;
        }
      }
      expect(reducedCount).toBeGreaterThan(0);
    });
  });

  describe('actualSpend differs from targetSpend when guardrails are active', () => {
    it('should have at least one year where actualSpend != targetSpend (guardrails engaged)', () => {
      const mismatchYear = guardrailYearly.find(
        (yr) => Math.abs(yr.actualSpend - yr.targetSpend) > TOLERANCE
      );
      expect(mismatchYear).toBeDefined();
    });
  });

  describe('Control run: guardrails disabled', () => {
    it('should have actualSpend == targetSpend every year when guardrails are off', () => {
      for (const yr of controlYearly) {
        expect(closeTo(yr.actualSpend, yr.targetSpend)).toBe(true);
      }
    });
  });

  describe('All actualSpend within guardrail bounds', () => {
    it('should never exceed the inflation-adjusted ceiling', () => {
      for (let i = 0; i < guardrailYearly.length; i++) {
        const yr = guardrailYearly[i];
        const inflationMultiplier = Math.pow(1.02, i);
        const inflatedCeiling = 130_000 * inflationMultiplier;

        // Allow small tolerance for floating point
        expect(yr.actualSpend).toBeLessThanOrEqual(inflatedCeiling + TOLERANCE);
      }
    });

    it('should never go below the inflation-adjusted floor (when portfolio has funds)', () => {
      for (let i = 0; i < guardrailYearly.length; i++) {
        const yr = guardrailYearly[i];
        const inflationMultiplier = Math.pow(1.02, i);
        const inflatedFloor = 70_000 * inflationMultiplier;

        // Only check while the portfolio has sufficient balance
        const totalBalance = Object.values(yr.endBalanceByAccount).reduce(
          (s, v) => s + v,
          0
        );
        if (totalBalance > inflatedFloor && yr.shortfall === 0) {
          expect(yr.actualSpend).toBeGreaterThanOrEqual(inflatedFloor - TOLERANCE);
        }
      }
    });
  });

  describe('Spending inflation over time', () => {
    it('should have year 1 target spend equal to base ($100,000)', () => {
      // Year 0 (yearIndex 0): inflationMultiplier = 1.0 -> target = $100,000
      expect(closeTo(guardrailYearly[0].targetSpend, 100_000)).toBe(true);
    });

    it('should have year 2 target spend inflated by 2%', () => {
      // Year 1 (yearIndex 1): inflationMultiplier = 1.02 -> target = $102,000
      expect(closeTo(guardrailYearly[1].targetSpend, 102_000)).toBe(true);
    });

    it('should have year 5 target spend inflated to ~$108,243', () => {
      // Year 4 (yearIndex 4): inflationMultiplier = 1.02^4 = 1.08243... -> target = $108,243
      const expected = 100_000 * Math.pow(1.02, 4);
      expect(closeTo(guardrailYearly[4].targetSpend, expected, 10)).toBe(true);
    });
  });

  describe('Portfolio trajectory', () => {
    it('should have a growing portfolio in early years (7% return > withdrawal rate)', () => {
      const balance0 = Object.values(guardrailYearly[0].endBalanceByAccount).reduce(
        (s, v) => s + v,
        0
      );
      const balance5 = Object.values(guardrailYearly[4].endBalanceByAccount).reduce(
        (s, v) => s + v,
        0
      );
      expect(balance5).toBeGreaterThan(balance0);
    });

    it('should have the portfolio peak and then decline over the 25-year horizon', () => {
      const balances = guardrailYearly.map((yr) =>
        Object.values(yr.endBalanceByAccount).reduce((s, v) => s + v, 0)
      );
      const peakBalance = Math.max(...balances);
      const lastBalance = balances[balances.length - 1];

      // The last balance should be less than the peak
      expect(lastBalance).toBeLessThan(peakBalance);
      // Portfolio should still be positive at end
      expect(lastBalance).toBeGreaterThan(0);
    });
  });

  describe('No RMD for this fixture', () => {
    it('should have zero RMDs throughout (only taxable account, no tax-deferred)', () => {
      for (const yr of guardrailYearly) {
        expect(yr.rmdTotal).toBe(0);
      }
    });
  });

  describe('Guardrail vs control spending divergence', () => {
    it('should have different actual spending in at least some years', () => {
      let differenceCount = 0;
      for (let i = 0; i < guardrailYearly.length; i++) {
        if (
          Math.abs(guardrailYearly[i].actualSpend - controlYearly[i].actualSpend) > TOLERANCE
        ) {
          differenceCount++;
        }
      }
      expect(differenceCount).toBeGreaterThan(0);
    });

    it('should have identical target spending between guardrail and control runs', () => {
      // Target spend is always the same regardless of guardrails; only actualSpend differs
      for (let i = 0; i < guardrailYearly.length; i++) {
        expect(
          closeTo(guardrailYearly[i].targetSpend, controlYearly[i].targetSpend)
        ).toBe(true);
      }
    });
  });

  describe('Guardrail spending is always between floor and target when floor guard triggers', () => {
    it('should have actualSpend <= targetSpend for all years where floor guard fires', () => {
      for (const yr of guardrailYearly) {
        // When the floor guardrail fires, actualSpend is clamped to at most the target
        // (it reduces spending, never increases it for the floor rule)
        expect(yr.actualSpend).toBeLessThanOrEqual(yr.targetSpend + TOLERANCE);
      }
    });
  });
});
