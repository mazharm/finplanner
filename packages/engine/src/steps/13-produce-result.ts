import type { YearResult } from '@finplanner/domain';
import type {
  AccountState,
  YearContext,
  MandatoryIncome,
  RmdResult,
  SpendingResult,
  WithdrawalResult,
  TaxResult,
  NetSpendableResult,
} from '../types.js';

/**
 * Step 13: Produce Year Result
 *
 * Assembles all computed values for the year into a single YearResult object.
 */
export function produceYearResult(
  yearContext: YearContext,
  spending: SpendingResult,
  mandatoryIncome: MandatoryIncome,
  rmdResult: RmdResult,
  withdrawalResult: WithdrawalResult,
  taxResult: TaxResult,
  netSpendableResult: NetSpendableResult,
  accounts: AccountState[]
): YearResult {
  // Build end-of-year balance and cost basis snapshots
  const endBalanceByAccount: Record<string, number> = {};
  const costBasisByAccount: Record<string, number> = {};

  for (const account of accounts) {
    endBalanceByAccount[account.id] = Math.max(0, account.balance);
    costBasisByAccount[account.id] = Math.max(0, account.costBasis);
  }

  return {
    year: yearContext.calendarYear,
    agePrimary: yearContext.agePrimary,
    ageSpouse: yearContext.ageSpouse,
    isSurvivorPhase: yearContext.isSurvivorPhase,
    filingStatus: yearContext.filingStatus,
    targetSpend: spending.targetSpend,
    actualSpend: spending.actualSpend,
    grossIncome: netSpendableResult.grossIncome,
    socialSecurityIncome: mandatoryIncome.socialSecurityIncome,
    nqdcDistributions: mandatoryIncome.nqdcDistributions,
    rmdTotal: rmdResult.rmdTotal,
    pensionAndOtherIncome: mandatoryIncome.pensionAndOtherIncome,
    rothWithdrawals: withdrawalResult.rothWithdrawals,
    withdrawalsByAccount: withdrawalResult.withdrawalsByAccount,
    taxesFederal: taxResult.taxesFederal,
    taxesState: taxResult.taxesState,
    taxableOrdinaryIncome: taxResult.taxableOrdinaryIncome,
    taxableCapitalGains: taxResult.taxableCapitalGains,
    netSpendable: netSpendableResult.netSpendable,
    shortfall: netSpendableResult.shortfall,
    surplus: netSpendableResult.surplus,
    endBalanceByAccount,
    costBasisByAccount,
  };
}
