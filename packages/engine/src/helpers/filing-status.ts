import type { FilingStatus } from '@finplanner/domain';

/**
 * Derive the filing status for a survivor based on how many years
 * have elapsed since the survivor phase began.
 *
 * IRS rules:
 *  - Year of death (year 1): can file MFJ
 *  - Two following tax years (years 2-3): qualifying surviving spouse
 *  - Year 4+: must file as 'single'
 *
 * survivorYearCount is 1-indexed (1 = first survivor year = year of death).
 */
export function deriveSurvivorFilingStatus(survivorYearCount: number): FilingStatus {
  if (survivorYearCount <= 3) return 'survivor';
  return 'single';
}
