import type { AccountState } from '../types.js';

/**
 * Step 11: Apply Advisory / Management Fees
 *
 * For each account, reduces the balance by the fee percentage.
 * Fees are applied at end of year, after all withdrawals and deposits.
 *
 * balance *= (1 - feePct / 100)
 */
export function applyFees(accounts: AccountState[]): void {
  for (const account of accounts) {
    if (account.balance <= 0) continue;
    if (account.feePct <= 0) continue;

    account.balance *= (1 - account.feePct / 100);

    // Floor at zero
    if (account.balance < 0) {
      account.balance = 0;
    }
  }
}
