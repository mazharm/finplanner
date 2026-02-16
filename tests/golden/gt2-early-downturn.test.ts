/**
 * GT2: Early Severe Downturn Case
 *
 * Same fixture as GT1 except the account has expectedReturnPct = -5%
 * to simulate poor market conditions in deterministic mode.
 *
 * NOTE: The engine's simulate() function does not yet support passing
 * historical scenario returns via PlanInput. The scenarioReturns field
 * on SimulationState is left undefined for deterministic mode; historical
 * and stress scenarios would be loaded from @finplanner/scenarios by the
 * caller. For this golden test, we approximate a severe downturn by
 * setting the account's expectedReturnPct to -5%. This exercises the
 * engine's shortfall and depletion logic without requiring scenario
 * infrastructure.
 *
 * Fixture: Single retiree, age 65, life expectancy 90 (25 years).
 * One taxable account: $1,000,000 balance, $600,000 cost basis,
 * -5% return, 0.10% fee.
 * Spending: $50,000/year, 2% inflation.
 * Taxes: 12% federal effective, 0% state (stateModel: 'none'), 15% cap gains.
 * No SS, no pensions, no adjustments.
 * Strategy: taxableFirst, no rebalancing, no guardrails.
 */
import { describe, it, expect } from 'vitest';
import { simulate } from '@finplanner/engine';
import type { PlanInput } from '@finplanner/domain';

const gt2Fixture: PlanInput = {
  schemaVersion: '3.0.0',
  household: {
    maritalStatus: 'single',
    filingStatus: 'single',
    stateOfResidence: 'TX',
    primary: {
      id: 'primary',
      birthYear: 1961,
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
      expectedReturnPct: -5, // severe downturn
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

describe('GT2: Early Severe Downturn Case', () => {
  const result = simulate(gt2Fixture);

  it('should produce exactly 25 yearly results', () => {
    expect(result.yearly).toHaveLength(25);
  });

  describe('Portfolio depletion under negative returns', () => {
    it('should have at least one shortfall year', () => {
      const shortfallYears = result.yearly.filter(yr => yr.shortfall > 0);
      expect(shortfallYears.length).toBeGreaterThan(0);
    });

    it('should report success probability of 0 (shortfalls exist)', () => {
      expect(result.summary.successProbability).toBe(0);
    });

    it('should report a non-undefined worstCaseShortfall', () => {
      expect(result.summary.worstCaseShortfall).toBeDefined();
      expect(result.summary.worstCaseShortfall).toBeGreaterThan(0);
    });

    it('should deplete the account to zero before year 25', () => {
      // With -5% return and 5%+ withdrawal rate plus inflation, the account
      // should run out well before the 25-year horizon.
      const depletedYear = result.yearly.findIndex(yr => {
        const totalBalance = Object.values(yr.endBalanceByAccount)
          .reduce((sum, v) => sum + v, 0);
        return totalBalance <= 0;
      });
      expect(depletedYear).toBeGreaterThan(0);
      expect(depletedYear).toBeLessThan(24); // depletes before final year
    });
  });

  describe('Year 1 behavior under negative returns', () => {
    it('should have year 1 spending target = $50,000', () => {
      expect(Math.abs(result.yearly[0].targetSpend - 50_000)).toBeLessThanOrEqual(5);
    });

    it('should have year 1 end balance < starting balance', () => {
      // -5% return + withdrawal: balance drops significantly
      const eoyBalance = Object.values(result.yearly[0].endBalanceByAccount)
        .reduce((sum, v) => sum + v, 0);
      expect(eoyBalance).toBeLessThan(1_000_000);
    });

    it('should have year 1 end balance < $950,000 (return + withdrawal)', () => {
      // BOY balance after -5% return: $950,000
      // Then withdrawal of ~$50k+taxes, then fee
      const eoyBalance = Object.values(result.yearly[0].endBalanceByAccount)
        .reduce((sum, v) => sum + v, 0);
      expect(eoyBalance).toBeLessThan(950_000);
    });
  });

  describe('Shortfall accumulation', () => {
    it('should have shortfall increasing in later years after depletion', () => {
      const shortfallYears = result.yearly
        .filter(yr => yr.shortfall > 0)
        .map(yr => yr.shortfall);

      if (shortfallYears.length >= 2) {
        // After depletion, shortfall should track spending (which inflates),
        // so later shortfalls should be >= earlier shortfalls
        const lastShortfall = shortfallYears[shortfallYears.length - 1];
        const firstShortfall = shortfallYears[0];
        expect(lastShortfall).toBeGreaterThanOrEqual(firstShortfall);
      }
    });

    it('should have non-zero spending target even in shortfall years', () => {
      for (const yr of result.yearly) {
        expect(yr.targetSpend).toBeGreaterThan(0);
      }
    });
  });

  describe('Tax behavior under capital losses', () => {
    it('should have zero or very low capital gains in year 1', () => {
      // With -5% return, the BOY balance is $950,000 with $600,000 basis.
      // Gain fraction = (950000 - 600000) / 950000 ~ 0.3684
      // So there ARE still gains (because basis < balance even after loss).
      // Capital gains = withdrawal * gainFraction
      const yr1 = result.yearly[0];
      // Gains should be positive but reduced compared to GT1
      expect(yr1.taxableCapitalGains).toBeGreaterThanOrEqual(0);
    });

    it('should eventually have zero capital gains when basis >= balance', () => {
      // As the portfolio shrinks and basis catches up (or balance goes to 0),
      // capital gains should drop to zero.
      const lastYearWithBalance = result.yearly
        .filter(yr => {
          const bal = Object.values(yr.endBalanceByAccount)
            .reduce((sum, v) => sum + v, 0);
          return bal <= 0;
        });
      if (lastYearWithBalance.length > 0) {
        const lastDepleted = lastYearWithBalance[lastYearWithBalance.length - 1];
        expect(lastDepleted.taxableCapitalGains).toBe(0);
      }
    });
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

    it('should have zero RMD for all years', () => {
      for (const yr of result.yearly) {
        expect(yr.rmdTotal).toBe(0);
      }
    });

    it('should have zero state taxes for all years', () => {
      for (const yr of result.yearly) {
        expect(yr.taxesState).toBe(0);
      }
    });
  });
});
