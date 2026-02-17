import { describe, it, expect } from 'vitest';
import { simulate } from '@finplanner/engine';
import type { PlanInput } from '@finplanner/domain';

/**
 * GT5: Deferred Comp Concentrated Payout Case
 *
 * Validates NQDC (Non-Qualified Deferred Compensation) distribution mechanics:
 * - Distributions start in the scheduled startYear (calendar year, not year index)
 * - Annual scheduled amount is distributed each year within the window
 * - Distributions are capped at remaining account balance
 * - NQDC distributions are classified as ordinary income
 * - After depletion, no further distributions occur
 * - The taxOptimized strategy may also make discretionary withdrawals from
 *   deferredComp accounts to fill the 0% tax bracket (standard deduction space)
 *
 * Fixture: Single retiree, age 60, LE 85 (25-year horizon).
 * NQDC account: $500k, 4% return, schedule 2027-2031 @ $120k/year.
 * Taxable account: $800k ($400k basis), 6% return, 0.10% fee.
 *
 * NQDC balance walkthrough (accounting for taxOptimized deduction-filling):
 * - Year 1 (2026): BOY=$500k; after 4% return=$520k; no scheduled dist;
 *   taxOptimized fills $14,600 std deduction from NQDC; EOY=$505,400
 * - Year 2 (2027): BOY=$505,400; after 4%=$525,616; scheduled dist $120k;
 *   EOY=$405,616
 * - Year 3 (2028): BOY=$405,616; after 4%=$421,840.64; dist $120k; EOY=$301,840.64
 * - Year 4 (2029): BOY=$301,840.64; after 4%=$313,914.27; dist $120k; EOY=$193,914.27
 * - Year 5 (2030): BOY=$193,914.27; after 4%=$201,670.84; dist $120k; EOY=$81,670.84
 * - Year 6 (2031): BOY=$81,670.84; after 4%=$84,937.67; dist capped; EOY=$0
 */

/** Tolerance for dollar comparisons */
const TOLERANCE = 5;

const fixture: PlanInput = {
  schemaVersion: '3.0.0',
  household: {
    maritalStatus: 'single',
    filingStatus: 'single',
    stateOfResidence: 'TX',
    primary: {
      id: 'primary',
      birthYear: 1966, // 2026 - 60
      currentAge: 60,
      retirementAge: 60,
      lifeExpectancy: 85,
    },
  },
  accounts: [
    {
      id: 'nqdc-1',
      name: 'Deferred Comp Plan',
      type: 'deferredComp',
      owner: 'primary',
      currentBalance: 500_000,
      expectedReturnPct: 4,
      feePct: 0,
      deferredCompSchedule: {
        startYear: 2027,
        endYear: 2031,
        frequency: 'annual',
        amount: 120_000,
        inflationAdjusted: false,
      },
    },
    {
      id: 'taxable-1',
      name: 'Brokerage Account',
      type: 'taxable',
      owner: 'primary',
      currentBalance: 800_000,
      costBasis: 400_000,
      expectedReturnPct: 6,
      feePct: 0.10,
    },
  ],
  otherIncome: [],
  adjustments: [],
  spending: {
    targetAnnualSpend: 100_000,
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

describe('GT5: Deferred Comp Concentrated Payout', () => {
  const result = simulate(fixture);
  const yearly = result.yearly;

  it('should produce 25 years of results (age 60 to 85)', () => {
    expect(yearly.length).toBe(25);
  });

  describe('Year 1 (2026) — before NQDC distribution window', () => {
    const yr1 = yearly[0];

    it('should have zero scheduled NQDC distributions (startYear is 2027)', () => {
      expect(yr1.nqdcDistributions).toBe(0);
    });

    it('should have calendar year 2026 and age 60', () => {
      expect(yr1.year).toBe(2026);
      expect(yr1.agePrimary).toBe(60);
    });

    it('should cover spending from the taxable account', () => {
      expect(yr1.withdrawalsByAccount['taxable-1']).toBeGreaterThan(0);
    });

    it('should have NQDC end balance of ~$505,400', () => {
      // BOY return: 500,000 * 1.04 = 520,000; no scheduled distribution;
      // taxOptimized fills the $14,600 standard deduction from NQDC;
      // EOY = 520,000 - 14,600 = 505,400
      expect(Math.abs(yr1.endBalanceByAccount['nqdc-1'] - 505_400)).toBeLessThanOrEqual(TOLERANCE);
    });

    it('should withdraw from NQDC to fill the 0% tax bracket (standard deduction)', () => {
      // taxOptimized strategy: fills the $14,600 single standard deduction
      // from deferredComp/taxDeferred before going to taxable
      expect(yr1.withdrawalsByAccount['nqdc-1']).toBeGreaterThan(0);
      expect(Math.abs(yr1.withdrawalsByAccount['nqdc-1'] - 14_600)).toBeLessThanOrEqual(TOLERANCE);
    });
  });

  describe('Year 2 (2027) — first NQDC distribution year', () => {
    const yr2 = yearly[1];

    it('should have $120,000 NQDC distribution', () => {
      expect(Math.abs(yr2.nqdcDistributions - 120_000)).toBeLessThanOrEqual(TOLERANCE);
    });

    it('should have NQDC end balance of ~$405,616', () => {
      // BOY: 505,400 * 1.04 = 525,616; scheduled dist $120,000; EOY = 405,616
      expect(Math.abs(yr2.endBalanceByAccount['nqdc-1'] - 405_616)).toBeLessThanOrEqual(TOLERANCE);
    });
  });

  describe('Year 3 (2028) — second NQDC distribution year', () => {
    const yr3 = yearly[2];

    it('should have $120,000 NQDC distribution', () => {
      expect(Math.abs(yr3.nqdcDistributions - 120_000)).toBeLessThanOrEqual(TOLERANCE);
    });

    it('should have NQDC end balance of ~$301,841', () => {
      // BOY: 405,616 * 1.04 = 421,840.64; dist $120,000; EOY = 301,840.64
      expect(Math.abs(yr3.endBalanceByAccount['nqdc-1'] - 301_841)).toBeLessThanOrEqual(TOLERANCE);
    });
  });

  describe('Year 4 (2029) — third NQDC distribution year', () => {
    const yr4 = yearly[3];

    it('should have $120,000 NQDC distribution', () => {
      expect(Math.abs(yr4.nqdcDistributions - 120_000)).toBeLessThanOrEqual(TOLERANCE);
    });

    it('should have NQDC end balance of ~$193,914', () => {
      // BOY: 301,840.64 * 1.04 = 313,914.27; dist $120,000; EOY = 193,914.27
      expect(Math.abs(yr4.endBalanceByAccount['nqdc-1'] - 193_914)).toBeLessThanOrEqual(10);
    });
  });

  describe('Year 5 (2030) — fourth NQDC distribution year', () => {
    const yr5 = yearly[4];

    it('should have $120,000 NQDC distribution', () => {
      expect(Math.abs(yr5.nqdcDistributions - 120_000)).toBeLessThanOrEqual(TOLERANCE);
    });

    it('should have NQDC end balance of ~$81,671', () => {
      // BOY: 193,914.27 * 1.04 = 201,670.84; dist $120,000; EOY = 81,670.84
      expect(Math.abs(yr5.endBalanceByAccount['nqdc-1'] - 81_671)).toBeLessThanOrEqual(10);
    });
  });

  describe('Year 6 (2031) — final NQDC distribution year (capped at balance)', () => {
    const yr6 = yearly[5];

    it('should have NQDC distribution capped at remaining balance (~$84,938)', () => {
      // BOY: 81,670.84 * 1.04 = 84,937.67; distribute min(120,000, 84,938) = 84,938
      expect(yr6.nqdcDistributions).toBeGreaterThan(80_000);
      expect(yr6.nqdcDistributions).toBeLessThan(120_000);
      expect(Math.abs(yr6.nqdcDistributions - 84_938)).toBeLessThanOrEqual(10);
    });

    it('should have NQDC end balance of $0', () => {
      expect(yr6.endBalanceByAccount['nqdc-1']).toBe(0);
    });
  });

  describe('Year 7+ (2032 onward) — after NQDC exhaustion', () => {
    it('should have zero NQDC distributions from year 7 onward', () => {
      for (let i = 6; i < yearly.length; i++) {
        expect(yearly[i].nqdcDistributions).toBe(0);
      }
    });

    it('should have zero NQDC balance from year 7 onward', () => {
      for (let i = 6; i < yearly.length; i++) {
        expect(yearly[i].endBalanceByAccount['nqdc-1']).toBe(0);
      }
    });
  });

  describe('NQDC distributions are ordinary income', () => {
    it('should include NQDC distributions in taxable ordinary income (years 2-5)', () => {
      for (let i = 1; i <= 4; i++) {
        const yr = yearly[i];
        // NQDC distributes $120k as ordinary income; after $14,600 std deduction,
        // taxableOrdinaryIncome = $120k - $14.6k = $105.4k (roughly)
        expect(yr.taxableOrdinaryIncome).toBeGreaterThan(100_000);
      }
    });

    it('should compute federal taxes on NQDC distribution years', () => {
      for (let i = 1; i <= 5; i++) {
        expect(yearly[i].taxesFederal).toBeGreaterThan(0);
      }
    });

    it('should have zero state taxes (stateModel: none)', () => {
      for (const yr of yearly) {
        expect(yr.taxesState).toBe(0);
      }
    });
  });

  describe('Distribution schedule correctness', () => {
    it('NQDC scheduled distributions for years 2-5 should each be exactly $120,000', () => {
      for (let i = 1; i <= 4; i++) {
        expect(Math.abs(yearly[i].nqdcDistributions - 120_000)).toBeLessThanOrEqual(TOLERANCE);
      }
    });

    it('total NQDC distributions across all years should account for all principal and growth', () => {
      const totalDistributed = yearly.reduce((sum, yr) => sum + yr.nqdcDistributions, 0);
      // Year 1: 0; Years 2-5: 120k each = 480k; Year 6: ~84,451
      // Total ~ 564,451. This is less than the naive walkthrough (~582k) because
      // the taxOptimized strategy withdrew $14.6k from NQDC in year 1, reducing
      // the compounding base. Those $14.6k appear in withdrawalsByAccount instead.
      expect(totalDistributed).toBeGreaterThan(560_000);
      expect(totalDistributed).toBeLessThan(570_000);
    });

    it('total NQDC distributions + discretionary NQDC withdrawals should account for all funds', () => {
      // Total cash extracted from the NQDC account includes both scheduled
      // distributions and any discretionary withdrawals by the withdrawal solver
      const totalNqdcCash = yearly.reduce((sum, yr) => {
        const dist = yr.nqdcDistributions;
        const discretionary = yr.withdrawalsByAccount['nqdc-1'] ?? 0;
        return sum + dist + discretionary;
      }, 0);
      // All principal ($500k) + all growth should be extracted
      expect(totalNqdcCash).toBeGreaterThan(575_000);
      expect(totalNqdcCash).toBeLessThan(590_000);
    });
  });
});
