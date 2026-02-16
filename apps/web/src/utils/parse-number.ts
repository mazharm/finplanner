/**
 * Safely parse a string to a number, returning a fallback for empty/invalid values.
 * Prevents NaN propagation from Number("") in form inputs.
 */
export function safeParseNumber(value: string, fallback: number = 0): number {
  if (value === '' || value === '-') return fallback;
  const num = Number(value);
  return isNaN(num) ? fallback : num;
}
