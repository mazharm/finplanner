import type { StrategyConfig } from '@finplanner/domain';
import type { AccountState, WithdrawalResult } from '../types.js';
import { computeGainFraction, computeTaxableGain, reduceBasis } from '../helpers/cost-basis.js';

/**
 * Step 8: Solve Withdrawals
 *
 * Note: The pro-rata strategy draws proportionally from all account types including
 * Roth. This is an intentional simplification — in practice, Roth withdrawals are
 * typically deferred as long as possible for tax-free growth. Users who want Roth-last
 * behavior should use the taxableFirst or taxOptimized strategies.
 *
 * Implements 4 withdrawal strategies to meet the withdrawal target:
 * - taxableFirst: Taxable -> TaxDeferred -> Roth
 * - taxDeferredFirst: TaxDeferred -> Taxable -> Roth
 * - proRata: Proportional from all accounts
 * - taxOptimized: Fill low brackets first, minimize total taxes
 */
export function solveWithdrawals(
  accounts: AccountState[],
  withdrawalTarget: number,
  strategy: StrategyConfig['withdrawalOrder'],
  currentOrdinaryIncome: number,
  standardDeduction: number,
  federalEffectiveRate: number,
  capGainsRate: number
): WithdrawalResult {
  if (withdrawalTarget <= 0) {
    return {
      withdrawalsByAccount: {},
      totalWithdrawn: 0,
      taxableOrdinaryFromWithdrawals: 0,
      taxableCapGainsFromWithdrawals: 0,
      rothWithdrawals: 0,
    };
  }

  switch (strategy) {
    case 'taxableFirst':
      return withdrawTaxableFirst(accounts, withdrawalTarget);
    case 'taxDeferredFirst':
      return withdrawTaxDeferredFirst(accounts, withdrawalTarget);
    case 'proRata':
      return withdrawProRata(accounts, withdrawalTarget);
    case 'taxOptimized':
      return withdrawTaxOptimized(
        accounts,
        withdrawalTarget,
        currentOrdinaryIncome,
        standardDeduction,
        federalEffectiveRate,
        capGainsRate
      );
    default:
      return withdrawTaxableFirst(accounts, withdrawalTarget);
  }
}

// ---- Strategy: Taxable First ----

function withdrawTaxableFirst(
  accounts: AccountState[],
  target: number
): WithdrawalResult {
  const result = createEmptyResult();
  let remaining = target;

  // 1. Taxable accounts
  remaining = withdrawFromType(accounts, 'taxable', remaining, result);

  // 2. Tax-deferred accounts (including deferredComp)
  remaining = withdrawFromType(accounts, 'taxDeferred', remaining, result);
  remaining = withdrawFromType(accounts, 'deferredComp', remaining, result);

  // 3. Roth accounts
  remaining = withdrawFromType(accounts, 'roth', remaining, result);

  result.totalWithdrawn = target - remaining;
  return result;
}

// ---- Strategy: Tax-Deferred First ----

function withdrawTaxDeferredFirst(
  accounts: AccountState[],
  target: number
): WithdrawalResult {
  const result = createEmptyResult();
  let remaining = target;

  // 1. Tax-deferred accounts
  remaining = withdrawFromType(accounts, 'taxDeferred', remaining, result);
  remaining = withdrawFromType(accounts, 'deferredComp', remaining, result);

  // 2. Taxable accounts
  remaining = withdrawFromType(accounts, 'taxable', remaining, result);

  // 3. Roth accounts
  remaining = withdrawFromType(accounts, 'roth', remaining, result);

  result.totalWithdrawn = target - remaining;
  return result;
}

// ---- Strategy: Pro Rata ----

function withdrawProRata(
  accounts: AccountState[],
  target: number
): WithdrawalResult {
  const result = createEmptyResult();

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);
  if (totalBalance <= 0) {
    return result;
  }

  // Cap withdrawal at total available balance
  const actualTarget = Math.min(target, totalBalance);

  let totalWithdrawnSoFar = 0;
  const withdrawableAccounts = accounts.filter(a => a.balance > 0);

  for (let idx = 0; idx < withdrawableAccounts.length; idx++) {
    const account = withdrawableAccounts[idx];
    const isLast = idx === withdrawableAccounts.length - 1;

    if (isLast) {
      // Dust collection: last account takes the remainder for exact target
      const withdrawal = Math.min(actualTarget - totalWithdrawnSoFar, account.balance);
      applyWithdrawal(account, withdrawal, result);
      totalWithdrawnSoFar += withdrawal;
    } else {
      const proportion = account.balance / totalBalance;
      const withdrawal = Math.min(actualTarget * proportion, account.balance);
      applyWithdrawal(account, withdrawal, result);
      totalWithdrawnSoFar += withdrawal;
    }
  }

  result.totalWithdrawn = totalWithdrawnSoFar;
  return result;
}

// ---- Strategy: Tax-Optimized ----

function withdrawTaxOptimized(
  accounts: AccountState[],
  target: number,
  currentOrdinaryIncome: number,
  standardDeduction: number,
  federalEffectiveRate: number,
  capGainsRate: number
): WithdrawalResult {
  const result = createEmptyResult();
  let remaining = target;

  // Step 1: Fill the 0% bracket - withdraw from taxDeferred up to
  // (standardDeduction - currentOrdinaryIncome), which is the "free" space
  const freeOrdinarySpace = Math.max(0, standardDeduction - currentOrdinaryIncome);
  if (freeOrdinarySpace > 0) {
    const taxDeferredAccounts = accounts.filter(
      a => (a.type === 'taxDeferred' || a.type === 'deferredComp') && a.balance > 0
    );
    let spaceRemaining = Math.min(freeOrdinarySpace, remaining);
    for (const account of taxDeferredAccounts) {
      if (spaceRemaining <= 0 || remaining <= 0) break;
      const withdrawal = Math.min(spaceRemaining, account.balance, remaining);
      applyWithdrawal(account, withdrawal, result);
      spaceRemaining -= withdrawal;
      remaining -= withdrawal;
    }
  }

  if (remaining <= 0) {
    result.totalWithdrawn = target - remaining;
    return result;
  }

  // Step 2: Low-gain taxable withdrawals
  // If the effective cap gains rate is lower than the ordinary income rate,
  // prefer taxable accounts with low gain fractions
  const taxableAccounts = accounts.filter(a => a.type === 'taxable' && a.balance > 0);
  taxableAccounts.sort((a, b) => {
    const gainA = computeGainFraction(a.balance, a.costBasis);
    const gainB = computeGainFraction(b.balance, b.costBasis);
    return gainA - gainB; // lowest gain fraction first
  });

  if (capGainsRate < federalEffectiveRate) {
    // Prefer taxable accounts (cheaper to withdraw due to lower cap gains rate)
    for (const account of taxableAccounts) {
      if (remaining <= 0) break;
      const withdrawal = Math.min(remaining, account.balance);
      applyWithdrawal(account, withdrawal, result);
      remaining -= withdrawal;
    }

    // Then tax-deferred
    for (const account of accounts) {
      if (remaining <= 0) break;
      if ((account.type === 'taxDeferred' || account.type === 'deferredComp') && account.balance > 0) {
        const withdrawal = Math.min(remaining, account.balance);
        applyWithdrawal(account, withdrawal, result);
        remaining -= withdrawal;
      }
    }
  } else {
    // Prefer tax-deferred accounts (ordinary rate is cheaper or equal)
    for (const account of accounts) {
      if (remaining <= 0) break;
      if ((account.type === 'taxDeferred' || account.type === 'deferredComp') && account.balance > 0) {
        const withdrawal = Math.min(remaining, account.balance);
        applyWithdrawal(account, withdrawal, result);
        remaining -= withdrawal;
      }
    }

    for (const account of taxableAccounts) {
      if (remaining <= 0) break;
      if (account.balance > 0) {
        const withdrawal = Math.min(remaining, account.balance);
        applyWithdrawal(account, withdrawal, result);
        remaining -= withdrawal;
      }
    }
  }

  // Step 3: Roth last (tax-free)
  for (const account of accounts) {
    if (remaining <= 0) break;
    if (account.type === 'roth' && account.balance > 0) {
      const withdrawal = Math.min(remaining, account.balance);
      applyWithdrawal(account, withdrawal, result);
      remaining -= withdrawal;
    }
  }

  result.totalWithdrawn = target - Math.max(0, remaining);
  return result;
}

// ---- Shared helpers ----

function createEmptyResult(): WithdrawalResult {
  return {
    withdrawalsByAccount: {},
    totalWithdrawn: 0,
    taxableOrdinaryFromWithdrawals: 0,
    taxableCapGainsFromWithdrawals: 0,
    rothWithdrawals: 0,
  };
}

/**
 * Withdraw from all accounts of a given type until the remaining target is met.
 * Returns the new remaining amount.
 */
function withdrawFromType(
  accounts: AccountState[],
  type: AccountState['type'],
  remaining: number,
  result: WithdrawalResult
): number {
  for (const account of accounts) {
    if (remaining <= 0) break;
    if (account.type !== type || account.balance <= 0) continue;

    const withdrawal = Math.min(remaining, account.balance);
    applyWithdrawal(account, withdrawal, result);
    remaining -= withdrawal;
  }
  return remaining;
}

/**
 * Apply a withdrawal to a single account, updating balances,
 * cost basis, and tax tracking.
 */
function applyWithdrawal(
  account: AccountState,
  amount: number,
  result: WithdrawalResult
): void {
  if (amount <= 0) return;

  const actualAmount = Math.min(amount, account.balance);

  // Track withdrawal
  result.withdrawalsByAccount[account.id] =
    (result.withdrawalsByAccount[account.id] ?? 0) + actualAmount;

  // Apply tax treatment based on account type
  switch (account.type) {
    case 'taxable': {
      const gainFraction = computeGainFraction(account.balance, account.costBasis);
      const taxableGain = computeTaxableGain(actualAmount, gainFraction);
      result.taxableCapGainsFromWithdrawals += taxableGain;
      account.costBasis = reduceBasis(account.costBasis, actualAmount, gainFraction);
      break;
    }
    case 'taxDeferred':
    case 'deferredComp':
      // All withdrawals from tax-deferred accounts are ordinary income
      result.taxableOrdinaryFromWithdrawals += actualAmount;
      break;
    case 'roth':
      // Roth withdrawals are tax-free (assuming qualified distribution)
      result.rothWithdrawals += actualAmount;
      break;
    default: {
      // Compile-time exhaustiveness check: if a new account type is added,
      // TypeScript will error here (unless the union doesn't narrow to never).
      const _exhaustive: never = account.type;
      console.warn(`[FinPlanner] Unknown account type in withdrawal: ${_exhaustive}`);
      break;
    }
  }

  // Reduce balance
  account.balance -= actualAmount;
}
