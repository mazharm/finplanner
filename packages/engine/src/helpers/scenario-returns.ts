import type { AccountState } from '../types.js';

/**
 * Compute the weighted-average baseline return across all accounts.
 * This is the portfolio's overall expected return, weighted by balance.
 */
export function computeBaselineReturn(accounts: AccountState[]): number {
  let totalBalance = 0;
  let weightedReturn = 0;
  for (const acct of accounts) {
    totalBalance += acct.balance;
    weightedReturn += acct.balance * acct.expectedReturnPct;
  }
  if (totalBalance === 0) return 0;
  return weightedReturn / totalBalance;
}

/**
 * Compute the return for a specific account in a scenario year.
 *
 * Each account's return is the scenario return plus the account's
 * deviation from the portfolio baseline. This preserves relative
 * return differentials between accounts while applying the scenario's
 * overall market conditions.
 *
 * accountReturn = scenarioReturn + (account.expectedReturnPct - baselineReturn)
 */
export function computeAccountReturn(
  account: AccountState,
  scenarioReturn: number,
  baselineReturn: number
): number {
  return scenarioReturn + (account.expectedReturnPct - baselineReturn);
}
