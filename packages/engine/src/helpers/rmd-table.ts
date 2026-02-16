// RMD Uniform Lifetime Table lookup
// Data is embedded to avoid JSON import issues in various bundler configurations.

const rmdEntries: Array<{ age: number; distributionPeriod: number }> = [
  { age: 72, distributionPeriod: 27.4 },
  { age: 73, distributionPeriod: 26.5 },
  { age: 74, distributionPeriod: 25.5 },
  { age: 75, distributionPeriod: 24.6 },
  { age: 76, distributionPeriod: 23.7 },
  { age: 77, distributionPeriod: 22.9 },
  { age: 78, distributionPeriod: 22.0 },
  { age: 79, distributionPeriod: 21.1 },
  { age: 80, distributionPeriod: 20.2 },
  { age: 81, distributionPeriod: 19.4 },
  { age: 82, distributionPeriod: 18.5 },
  { age: 83, distributionPeriod: 17.7 },
  { age: 84, distributionPeriod: 16.8 },
  { age: 85, distributionPeriod: 16.0 },
  { age: 86, distributionPeriod: 15.2 },
  { age: 87, distributionPeriod: 14.4 },
  { age: 88, distributionPeriod: 13.7 },
  { age: 89, distributionPeriod: 12.9 },
  { age: 90, distributionPeriod: 12.2 },
  { age: 91, distributionPeriod: 11.5 },
  { age: 92, distributionPeriod: 10.8 },
  { age: 93, distributionPeriod: 10.1 },
  { age: 94, distributionPeriod: 9.5 },
  { age: 95, distributionPeriod: 8.9 },
  { age: 96, distributionPeriod: 8.4 },
  { age: 97, distributionPeriod: 7.8 },
  { age: 98, distributionPeriod: 7.3 },
  { age: 99, distributionPeriod: 6.8 },
  { age: 100, distributionPeriod: 6.4 },
  { age: 101, distributionPeriod: 6.0 },
  { age: 102, distributionPeriod: 5.6 },
  { age: 103, distributionPeriod: 5.2 },
  { age: 104, distributionPeriod: 4.9 },
  { age: 105, distributionPeriod: 4.6 },
  { age: 106, distributionPeriod: 4.3 },
  { age: 107, distributionPeriod: 4.1 },
  { age: 108, distributionPeriod: 3.9 },
  { age: 109, distributionPeriod: 3.7 },
  { age: 110, distributionPeriod: 3.5 },
  { age: 111, distributionPeriod: 3.4 },
  { age: 112, distributionPeriod: 3.3 },
  { age: 113, distributionPeriod: 3.1 },
  { age: 114, distributionPeriod: 3.0 },
  { age: 115, distributionPeriod: 2.9 },
  { age: 116, distributionPeriod: 2.8 },
  { age: 117, distributionPeriod: 2.7 },
  { age: 118, distributionPeriod: 2.5 },
  { age: 119, distributionPeriod: 2.3 },
  { age: 120, distributionPeriod: 2.0 },
];

const rmdMap = new Map<number, number>();
for (const entry of rmdEntries) {
  rmdMap.set(entry.age, entry.distributionPeriod);
}

/**
 * Determine the RMD start age based on birth year.
 * SECURE 2.0 Act rules:
 *  - Born 1950 or earlier: 72 (already started)
 *  - Born 1951-1959: 73
 *  - Born 1960+: 75
 */
export function getRmdStartAge(birthYear: number): number {
  if (birthYear <= 1950) return 72;
  if (birthYear <= 1959) return 73;
  return 75;
}

/**
 * Look up the distribution period from the IRS Uniform Lifetime Table.
 * Returns 0 if age < 72 (no RMD required).
 * Returns 2.0 for age > 120 (minimum distribution period).
 */
export function lookupDistributionPeriod(age: number): number {
  if (age < 72) return 0;
  if (age > 120) return 2.0;
  return rmdMap.get(age) ?? 2.0;
}
