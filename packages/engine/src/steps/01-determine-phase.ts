import type { SimulationState, AccountState, YearContext } from '../types.js';
import { deriveSurvivorFilingStatus } from '../helpers/filing-status.js';

/**
 * Step 1: Determine Phase
 *
 * Determines whether the simulation is in the joint phase or survivor phase,
 * computes ages, derives filing status, and consolidates accounts on the
 * first survivor year.
 */
export function determinePhase(state: SimulationState): YearContext {
  const { plan, yearIndex, currentYear } = state;
  const { household } = plan;
  const { primary, spouse } = household;

  const agePrimary = primary.currentAge + yearIndex;
  const yearsUntilPrimaryDeath = primary.lifeExpectancy - primary.currentAge;
  const primaryAlive = yearIndex < yearsUntilPrimaryDeath;

  let ageSpouse: number | undefined;
  let spouseAlive = false;

  if (spouse) {
    ageSpouse = spouse.currentAge + yearIndex;
    const yearsUntilSpouseDeath = spouse.lifeExpectancy - spouse.currentAge;
    spouseAlive = yearIndex < yearsUntilSpouseDeath;
  }

  // Determine survivor phase: only applies when there IS a spouse
  // and exactly one person has died
  const hasSpouse = spouse !== undefined;
  const isSurvivorPhase = hasSpouse && (!primaryAlive || !spouseAlive) && (primaryAlive || spouseAlive);

  let survivorId: 'primary' | 'spouse' | undefined;
  let survivorYearCount = 0;

  if (isSurvivorPhase) {
    survivorId = primaryAlive ? 'primary' : 'spouse';

    // Track the first survivor year index
    if (!state.survivorTransitioned) {
      state.firstSurvivorYearIndex = yearIndex;
      state.survivorTransitioned = true;

      // Consolidate deceased's accounts into survivor's ownership
      consolidateAccounts(state.accounts, survivorId);
    }

    survivorYearCount = yearIndex - state.firstSurvivorYearIndex + 1;
  }

  // Both dead (or single person dead): simulation continues with $0 balances
  // but we still produce rows
  const bothDead = hasSpouse
    ? (!primaryAlive && !spouseAlive)
    : !primaryAlive;

  // Derive filing status
  let filingStatus = household.filingStatus;
  if (bothDead) {
    // Use single for post-death years (all balances should be 0)
    filingStatus = 'single';
  } else if (isSurvivorPhase) {
    filingStatus = deriveSurvivorFilingStatus(survivorYearCount);
  }

  return {
    yearIndex,
    calendarYear: currentYear,
    agePrimary,
    ageSpouse,
    isSurvivorPhase,
    survivorId,
    survivorYearCount,
    filingStatus,
    primaryAlive,
    spouseAlive,
  };
}

/**
 * Consolidate all accounts owned by the deceased into the survivor's ownership.
 * Joint accounts transfer to sole survivor ownership.
 */
function consolidateAccounts(accounts: AccountState[], survivorId: 'primary' | 'spouse'): void {
  const deceasedId = survivorId === 'primary' ? 'spouse' : 'primary';

  for (const account of accounts) {
    if (account.owner === deceasedId || account.owner === 'joint') {
      account.owner = survivorId;
    }
  }
}
