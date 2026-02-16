import type { SimulationState } from '../types.js';
import { computeAccountReturn } from '../helpers/scenario-returns.js';

/**
 * Step 2: Apply Investment Returns (Beginning of Year)
 *
 * Grows each account balance by its expected return rate.
 * In deterministic mode, uses each account's own expectedReturnPct.
 * In historical/stress mode, uses the scenario return adjusted for
 * the account's deviation from the portfolio baseline.
 *
 * Cost basis for taxable accounts is NOT adjusted by returns
 * (unrealized gains grow the balance but not the basis).
 */
export function applyReturns(state: SimulationState): void {
  const { accounts, yearIndex, scenarioReturns, baselineReturn } = state;

  for (const account of accounts) {
    if (account.balance <= 0) continue;

    let returnPct: number;

    if (scenarioReturns && yearIndex < scenarioReturns.length) {
      // Scenario mode: adjust scenario return by account's deviation from baseline
      returnPct = computeAccountReturn(account, scenarioReturns[yearIndex], baselineReturn);
    } else {
      // Deterministic mode: use account's own expected return
      returnPct = account.expectedReturnPct;
    }

    account.balance *= (1 + returnPct / 100);

    // Floor at zero: an account cannot go negative due to returns
    if (account.balance < 0) {
      account.balance = 0;
    }
  }
}
