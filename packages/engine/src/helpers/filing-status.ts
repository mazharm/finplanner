import type { FilingStatus } from '@finplanner/domain';

/**
 * Derive the filing status for a survivor based on how many years
 * have elapsed since the survivor phase began.
 *
 * IRS rules:
 *  - Year of death and the following year: can use MFJ (modeled as 'survivor')
 *  - Year 3+: must file as 'single'
 *
 * survivorYearCount is 1-indexed (1 = first survivor year = year of death).
 */
export function deriveSurvivorFilingStatus(survivorYearCount: number): FilingStatus {
  if (survivorYearCount <= 2) return 'survivor';
  return 'single';
}
