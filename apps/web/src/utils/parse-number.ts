/**
 * Safely parse a string to a number, returning a fallback for empty/invalid values.
 * Prevents NaN propagation from Number("") in form inputs.
 * Optional min/max bounds clamp the result to a safe range.
 */
export function safeParseNumber(
  value: string,
  fallback: number = 0,
  min?: number,
  max?: number,
): number {
  if (value === '' || value === '-') return fallback;
  const num = Number(value);
  if (isNaN(num)) return fallback;
  let clamped = num;
  if (min !== undefined && clamped < min) clamped = min;
  if (max !== undefined && clamped > max) clamped = max;
  return clamped;
}
