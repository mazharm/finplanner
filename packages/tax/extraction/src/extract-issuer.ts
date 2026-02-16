export function extractIssuerName(text: string, formType?: string): string {
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
      const name = match[1].trim();
      if (name.length > 0 && name.length < 200) {
        return name;
      }
    }
  }

  return 'Unknown';
}
