/**
 * Issuer name matching utilities.
 *
 * Shared by tax anomaly detection and tax checklist generation.
 */

export function normalizeIssuerName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[.,\-]/g, ' ')       // punctuation to spaces
    .replace(/\b(inc|llc|corp|ltd|co|the)\b/gi, '') // remove common suffixes
    .replace(/\s+/g, ' ')          // collapse whitespace
    .trim();
}

export function tokenJaccardSimilarity(a: string, b: string): number {
  const tokensA = new Set(normalizeIssuerName(a).split(' ').filter(t => t.length > 0));
  const tokensB = new Set(normalizeIssuerName(b).split(' ').filter(t => t.length > 0));
  if (tokensA.size === 0 && tokensB.size === 0) return 1;
  if (tokensA.size === 0 || tokensB.size === 0) return 0;
  let intersection = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) intersection++;
  }
  const union = tokensA.size + tokensB.size - intersection;
  return union > 0 ? intersection / union : 0;
}

export function issuerNamesMatch(a: string, b: string): boolean {
  // Primary check: exact match after normalization
  if (normalizeIssuerName(a) === normalizeIssuerName(b)) return true;
  // Fallback: token-overlap Jaccard similarity >= 0.5
  return tokenJaccardSimilarity(a, b) >= 0.5;
}
