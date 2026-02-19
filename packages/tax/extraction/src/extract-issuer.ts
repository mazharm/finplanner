function cleanIssuerName(raw: string): string {
  let name = raw.trim();
  // Strip EIN/TIN/FEIN patterns (e.g., "12-3456789", "EIN: 12-3456789", "TIN 123456789")
  name = name.replace(/\b(?:EIN|TIN|FEIN)\s*:?\s*\d[\d-]*/gi, '');
  name = name.replace(/\b\d{2}-\d{7}\b/g, '');
  // Truncate at 3+ consecutive spaces (garbage separator)
  const garbageIdx = name.search(/\s{3,}/);
  if (garbageIdx > 0) {
    name = name.substring(0, garbageIdx);
  }
  return name.trim();
}

export function extractIssuerName(text: string, _formType?: string): string {
  // Common labels for issuer/payer/employer name
  const labels = [
    /(?:employer'?s?\s+name|employer\s+information)[:\s]*([^\n]+)/i,
    /(?:payer'?s?\s+name|PAYER'S\s+name)[:\s]*([^\n]+)/i,
    /(?:filer'?s?\s+name)[:\s]*([^\n]+)/i,
    /(?:partnership'?s?\s+name|entity'?s?\s+name)[:\s]*([^\n]+)/i,
    /(?:lender'?s?\s+name|recipient'?s?\s+name)[:\s]*([^\n]+)/i,
  ];

  for (const pattern of labels) {
    const match = pattern.exec(text);
    if (match && match[1]) {
      const name = cleanIssuerName(match[1]);
      if (name.length > 0 && name.length < 200) {
        return name;
      }
    }
  }

  return 'Unknown';
}
