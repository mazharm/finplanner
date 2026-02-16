import type { StrategyConfig } from '@finplanner/domain';
import type { AccountState } from '../types.js';
import { computeGainFraction, reduceBasis } from '../helpers/cost-basis.js';

export interface RebalanceResult {
  /** Realized capital gains from selling taxable account positions during rebalancing. */
  realizedCapitalGains: number;
}

/**
 * Step 12: Rebalance Portfolio
 *
 * Rebalances accounts with targetAllocationPct set to their target allocations.
 *
 * - 'none': skip
 * - 'annual': rebalance once at end of year (after fees)
 * - 'quarterly': conceptually rebalance 4 times per year (simplified: single rebalance)
 *
 * Rebalancing:
 * 1. Identify accounts with targetAllocationPct
 * 2. Compute total portfolio value of those accounts
 * 3. For each: targetBalance = total * (targetPct / 100)
 * 4. Transfer balances to match targets
 * 5. Adjust cost basis for taxable accounts
 * 6. Track realized capital gains from taxable account sales
 *
 * Returns realized capital gains so they can be included in the next year's
 * tax calculation (rebalancing occurs after tax computation in the current year).
 */
export function rebalance(
  accounts: AccountState[],
  rebalanceFrequency: StrategyConfig['rebalanceFrequency']
): RebalanceResult {
  if (rebalanceFrequency === 'none') return { realizedCapitalGains: 0 };

  // For both 'annual' and 'quarterly', we perform a single rebalance pass.
  // (Quarterly is a simplification; in production this would be integrated
  // into the return application step.)
  return performRebalance(accounts);
}

function performRebalance(accounts: AccountState[]): RebalanceResult {
  let realizedCapitalGains = 0;

  // Filter to accounts that participate in rebalancing
  const rebalanceable = accounts.filter(
    a => a.targetAllocationPct !== undefined && a.targetAllocationPct > 0
  );

  if (rebalanceable.length === 0) return { realizedCapitalGains: 0 };

  // Compute total portfolio value of rebalanceable accounts
  const totalValue = rebalanceable.reduce((sum, a) => sum + a.balance, 0);
  if (totalValue <= 0) return { realizedCapitalGains: 0 };

  // Compute target balances and deltas
  const deltas: Array<{ account: AccountState; targetBalance: number; delta: number }> = [];

  for (const account of rebalanceable) {
    const targetBalance = totalValue * (account.targetAllocationPct! / 100);
    const delta = targetBalance - account.balance;
    deltas.push({ account, targetBalance, delta });
  }

  // Apply rebalancing: adjust each account to its target
  for (const { account, targetBalance, delta } of deltas) {
    if (Math.abs(delta) < 0.01) continue; // Skip negligible adjustments

    if (account.type === 'taxable') {
      // For taxable accounts, adjust cost basis
      if (delta > 0) {
        // Inflow: new money increases basis proportionally
        // The funds come from other accounts being sold, so this is a purchase
        account.costBasis += delta;
      } else {
        // Outflow: selling from taxable account realizes capital gains
        const sellAmount = Math.abs(delta);
        const gainFraction = computeGainFraction(account.balance, account.costBasis);
        realizedCapitalGains += sellAmount * gainFraction;
        account.costBasis = reduceBasis(account.costBasis, sellAmount, gainFraction);
      }
    }

    account.balance = targetBalance;
  }

  return { realizedCapitalGains };
}
