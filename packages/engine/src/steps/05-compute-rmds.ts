import type { SimulationState, YearContext, RmdResult } from '../types.js';
import { getRmdStartAge, lookupDistributionPeriod } from '../helpers/rmd-table.js';

/**
 * Step 5: Compute Required Minimum Distributions (RMDs)
 *
 * For each tax-deferred account, computes the RMD based on the
 * account owner's age and the IRS Uniform Lifetime Table.
 *
 * RMDs are mandatory withdrawals that occur BEFORE discretionary withdrawals.
 * They are treated as ordinary income.
 *
 * In survivor phase, consolidated accounts use the survivor's age.
 */
export function computeRmds(
  state: SimulationState,
  yearContext: YearContext,
  priorYearEndBalances: Map<string, number>
): RmdResult {
  const { accounts, plan } = state;
  const { agePrimary, ageSpouse, primaryAlive, spouseAlive, isSurvivorPhase, survivorId } = yearContext;
  const { household } = plan;

  let rmdTotal = 0;
  const rmdByAccount: Record<string, number> = {};

  for (const account of accounts) {
    // RMDs only apply to taxDeferred accounts (not deferredComp or Roth)
    if (account.type !== 'taxDeferred') continue;
    if (account.balance <= 0) continue;

    // Determine the owner's age and birth year for RMD start age calculation
    let ownerAge: number;
    let ownerBirthYear: number;

    if (isSurvivorPhase) {
      // In survivor phase, all accounts are consolidated under the survivor
      if (survivorId === 'primary') {
        ownerAge = agePrimary;
        ownerBirthYear = household.primary.birthYear;
      } else {
        ownerAge = ageSpouse ?? agePrimary;
        ownerBirthYear = household.spouse?.birthYear ?? household.primary.birthYear;
      }
    } else {
      // Joint phase: use the account owner's age
      if (account.owner === 'primary') {
        ownerAge = agePrimary;
        ownerBirthYear = household.primary.birthYear;
      } else if (account.owner === 'spouse' && household.spouse) {
        if (ageSpouse === undefined) {
          throw new Error(`Spouse age is undefined for spouse-owned account ${account.id} but household has a spouse`);
        }
        ownerAge = ageSpouse;
        ownerBirthYear = household.spouse.birthYear;
      } else {
        // Joint or fallback to primary
        ownerAge = agePrimary;
        ownerBirthYear = household.primary.birthYear;
      }
    }

    // Check if owner has reached RMD start age
    const rmdStartAge = getRmdStartAge(ownerBirthYear);
    if (ownerAge < rmdStartAge) continue;

    // Look up the distribution period
    const distributionPeriod = lookupDistributionPeriod(ownerAge);
    if (distributionPeriod <= 0) continue;

    // Compute RMD using prior year-end balance (IRS requirement) if available
    const rmdBasis = priorYearEndBalances?.get(account.id) ?? account.balance;
    const rmd = rmdBasis / distributionPeriod;

    // Withdraw the RMD from the account
    account.balance -= rmd;
    rmdTotal += rmd;
    rmdByAccount[account.id] = (rmdByAccount[account.id] ?? 0) + rmd;
  }

  return { rmdTotal, rmdByAccount };
}
