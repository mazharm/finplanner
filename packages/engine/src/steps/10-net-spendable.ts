import type { AccountState, MandatoryIncome, WithdrawalResult, TaxResult, RmdResult, NetSpendableResult } from '../types.js';

/**
 * Step 10: Compute Net Spendable
 *
 * Determines the actual net spendable amount after taxes, and whether
 * there is a shortfall or surplus relative to the actual spending target.
 *
 * grossIncome = SS + NQDC + pensions + adjustments + RMDs + non-Roth discretionary withdrawals
 *   (does NOT include Roth withdrawals, which are tax-free but still spendable)
 *
 * netSpendable = grossIncome + rothWithdrawals - taxesFederal - taxesState
 *
 * shortfall = max(0, actualSpend - netSpendable)
 * surplus = max(0, netSpendable - actualSpend)
 *
 * If surplus > 0: deposit into first taxable account (both balance and costBasis increase).
 */
export function computeNetSpendable(
  actualSpend: number,
  mandatoryIncome: MandatoryIncome,
  rmdResult: RmdResult,
  withdrawalResult: WithdrawalResult,
  taxResult: TaxResult,
  accounts: AccountState[]
): NetSpendableResult {
  // Total cash received from non-Roth discretionary withdrawals
  // This includes both the taxable gain portion and the return-of-basis portion
  const totalNonRothWithdrawals =
    withdrawalResult.totalWithdrawn - withdrawalResult.rothWithdrawals;

  // Gross income: all cash inflows except Roth withdrawals
  const grossIncome =
    mandatoryIncome.socialSecurityIncome +
    mandatoryIncome.nqdcDistributions +
    mandatoryIncome.pensionAndOtherIncome +
    mandatoryIncome.adjustmentIncome +
    rmdResult.rmdTotal +
    totalNonRothWithdrawals;

  // Net spendable: gross income + Roth withdrawals - all taxes
  const netSpendable =
    grossIncome +
    withdrawalResult.rothWithdrawals -
    taxResult.taxesFederal -
    taxResult.taxesState;

  const shortfall = Math.max(0, actualSpend - netSpendable);
  const surplus = Math.max(0, netSpendable - actualSpend);

  // If surplus > 0, deposit into first taxable account
  if (surplus > 0) {
    depositSurplus(accounts, surplus);
  }

  return {
    netSpendable,
    shortfall,
    surplus,
    grossIncome,
  };
}

/**
 * Deposit surplus into the taxable account with the largest balance.
 * Both balance and costBasis increase (new money invested = new basis).
 */
function depositSurplus(accounts: AccountState[], surplus: number): void {
  const taxableAccounts = accounts.filter(a => a.type === 'taxable');
  if (taxableAccounts.length === 0) {
    // If no taxable account exists, the surplus is "spent" (consumed but not invested)
    return;
  }
  // Pick the taxable account with the largest balance
  const taxableAccount = taxableAccounts.reduce((best, a) =>
    a.balance > best.balance ? a : best
  );
  taxableAccount.balance += surplus;
  taxableAccount.costBasis += surplus;
}
