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
 * Note: Rebalancing across account types (taxable, tax-deferred, Roth) is an
 * intentional simplification. In practice, cross-account-type rebalancing involves
 * complex tax implications; here we model it as simple balance transfers with
 * capital gains tracking only on taxable account sales.
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
  // Per spec §19.1 item 6: rebalancing does not trigger capital gains in v1
  const realizedCapitalGains = 0;

  // Filter to accounts that participate in rebalancing
  const rebalanceable = accounts.filter(
    a => a.targetAllocationPct !== undefined && a.targetAllocationPct > 0
  );

  if (rebalanceable.length === 0) return { realizedCapitalGains: 0 };

  // Validate that targetAllocationPct sums to ~100% (allow floating point tolerance [99, 101])
  const totalPct = rebalanceable.reduce((sum, a) => sum + (a.targetAllocationPct ?? 0), 0);
  if (totalPct <= 0) {
    return { realizedCapitalGains: 0 };
  }
  // Compute normalized allocations without mutating input account objects
  const normalizedAlloc = new Map<string, number>();
  const scaleFactor = (totalPct < 99 || totalPct > 101) ? 100 / totalPct : 1;
  if (scaleFactor !== 1) {
    console.warn(
      `[FinPlanner] Rebalance: targetAllocationPct sums to ${totalPct.toFixed(2)}%, ` +
      `expected ~100%. Normalizing percentages.`
    );
  }
  for (const account of rebalanceable) {
    normalizedAlloc.set(account.id, (account.targetAllocationPct ?? 0) * scaleFactor);
  }

  // Compute total portfolio value of rebalanceable accounts
  const totalValue = rebalanceable.reduce((sum, a) => sum + a.balance, 0);
  if (totalValue <= 0) return { realizedCapitalGains: 0 };

  // Compute target balances and deltas
  const deltas: Array<{ account: AccountState; targetBalance: number; delta: number }> = [];

  for (const account of rebalanceable) {
    const targetBalance = totalValue * (normalizedAlloc.get(account.id)! / 100);
    const delta = targetBalance - account.balance;
    deltas.push({ account, targetBalance, delta });
  }

  // Compute aggregate gain fraction across all taxable accounts being sold,
  // so that funds flowing into a buying taxable account carry the correct
  // blended cost basis rather than assuming 100% basis on incoming funds.
  let totalTaxableSellAmount = 0;
  let totalTaxableSellBasis = 0;
  for (const { account, delta } of deltas) {
    if (account.type === 'taxable' && delta < 0) {
      const sellAmount = Math.abs(delta);
      const gainFraction = computeGainFraction(account.balance, account.costBasis);
      const basisPortion = sellAmount * (1 - gainFraction);
      totalTaxableSellAmount += sellAmount;
      totalTaxableSellBasis += basisPortion;
    }
  }
  const blendedBasisFraction = totalTaxableSellAmount > 0
    ? totalTaxableSellBasis / totalTaxableSellAmount
    : 1; // If no sells, incoming funds are from non-taxable accounts; treat as full basis.

  // Apply rebalancing: adjust each account to its target
  for (const { account, targetBalance, delta } of deltas) {
    if (Math.abs(delta) < 0.01) continue; // Skip negligible adjustments

    if (account.type === 'taxable') {
      // Per spec §19.1 item 6: rebalancing tax events -- notional transfers
      // do not trigger capital gains in v1. Only adjust cost basis.
      if (delta > 0) {
        // Incoming funds carry the blended basis fraction from sold taxable positions
        account.costBasis += delta * blendedBasisFraction;
      } else {
        const sellAmount = Math.abs(delta);
        const gainFraction = computeGainFraction(account.balance, account.costBasis);
        account.costBasis = reduceBasis(account.costBasis, sellAmount, gainFraction);
      }
    }

    account.balance = targetBalance;
  }

  return { realizedCapitalGains };
}
