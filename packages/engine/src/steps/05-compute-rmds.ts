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
  yearContext: YearContext
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
        ownerAge = ageSpouse ?? agePrimary;
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

    // Compute RMD
    const rmd = account.balance / distributionPeriod;

    // Withdraw the RMD from the account
    account.balance -= rmd;
    rmdTotal += rmd;
    rmdByAccount[account.id] = (rmdByAccount[account.id] ?? 0) + rmd;
  }

  return { rmdTotal, rmdByAccount };
}
