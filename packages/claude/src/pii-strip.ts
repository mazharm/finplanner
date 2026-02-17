import type { PortfolioAdviceRequest, TaxStrategyAdviceRequest, TaxDocument } from '@finplanner/domain';
import type { AnonymizedPortfolioContext, AnonymizedTaxContext } from './types.js';

/**
 * Sanitize a string value for LLM consumption by redacting PII patterns:
 *  - SSNs (XXX-XX-XXXX or XXX XX XXXX formatted patterns)
 *  - EINs (XX-XXXXXXX)
 *  - Bank/routing account numbers (sequences of 10+ digits)
 *
 * Note: Unformatted 9-digit SSNs (e.g., "123456789") are NOT redacted here
 * to avoid false positives with ZIP+4 codes and financial amounts. Use
 * sanitizeExtractedFields() for tax document fields where 9-digit sequences
 * are more likely to be SSNs.
 */
export function sanitizeForLlm(text: string): string {
  let result = text;
  // SSN patterns: 123-45-6789, 123 45 6789 (formatted patterns are more specific)
  result = result.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN_REDACTED]');
  result = result.replace(/\b\d{3}\s\d{2}\s\d{4}\b/g, '[SSN_REDACTED]');
  // EIN patterns: 12-3456789
  result = result.replace(/\b\d{2}-\d{7}\b/g, '[EIN_REDACTED]');
  // Email addresses
  result = result.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '[EMAIL_REDACTED]');
  // US phone numbers: (123) 456-7890, 123-456-7890, 123.456.7890, +1-123-456-7890
  result = result.replace(/(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b/g, '[PHONE_REDACTED]');
  // Bank/routing account numbers: sequences of 10+ digits (narrower range to avoid
  // false positives on financial amounts; 10+ digits covers most routing/account numbers
  // while avoiding collisions with 8-9 digit dollar amounts and ZIP+4 codes)
  result = result.replace(/\b\d{10,17}\b/g, '[ACCOUNT_REDACTED]');
  return result;
}

/**
 * Sanitize extractedFields record: redact PII from string values, pass numbers through.
 * Applies stricter redaction than sanitizeForLlm() — also catches unformatted 9-digit
 * SSN sequences, which are common in tax document extracted fields.
 */
function sanitizeExtractedFields(
  fields: Record<string, number | string>,
): Record<string, number | string> {
  const sanitized: Record<string, number | string> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (typeof value === 'string') {
      let result = sanitizeForLlm(value);
      // In tax document fields, unformatted 9-digit sequences are likely SSNs/TINs
      result = result.replace(/\b\d{9}\b/g, '[SSN_REDACTED]');
      sanitized[key] = result;
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  taxable: 'Taxable',
  taxDeferred: 'Tax-Deferred',
  deferredComp: 'Deferred-Comp',
  roth: 'Roth',
};

function accountLabel(type: string, index: number): string {
  const prefix = ACCOUNT_TYPE_LABELS[type] ?? type;
  return `${prefix} Account ${index}`;
}

function issuerLetter(index: number): string {
  return String.fromCharCode(65 + (index % 26)); // A-Z cycling
}

export function stripPortfolioPii(request: PortfolioAdviceRequest): AnonymizedPortfolioContext {
  const { planInput, planResultSummary, userPreferences } = request;
  const { household, accounts, otherIncome, taxes } = planInput;

  const typeCounts: Record<string, number> = {};
  const ownerLabels = new Map<string, string>();
  let ownerCounter = 0;
  function anonymizeOwner(owner: string): string {
    if (!ownerLabels.has(owner)) {
      ownerLabels.set(owner, `Owner ${String.fromCharCode(65 + ownerCounter++)}`);
    }
    return ownerLabels.get(owner)!;
  }

  const anonymizedAccounts = accounts.map((a) => {
    typeCounts[a.type] = (typeCounts[a.type] ?? 0) + 1;
    return {
      label: accountLabel(a.type, typeCounts[a.type]),
      type: sanitizeForLlm(a.type),
      owner: anonymizeOwner(a.owner),
      currentBalance: a.currentBalance,
      expectedReturnPct: a.expectedReturnPct,
      feePct: a.feePct,
    };
  });

  const anonymizedIncomeStreams = otherIncome.map((s, i) => ({
    label: `Income Stream ${i + 1}`,
    owner: anonymizeOwner(s.owner),
    startYear: s.startYear,
    endYear: s.endYear,
    annualAmount: s.annualAmount,
    taxable: s.taxable,
  }));

  return {
    household: {
      filingStatus: sanitizeForLlm(household.filingStatus),
      stateOfResidence: sanitizeForLlm(household.stateOfResidence),
      primary: {
        currentAge: household.primary.currentAge,
        retirementAge: household.primary.retirementAge,
        lifeExpectancy: household.primary.lifeExpectancy,
      },
      ...(household.spouse
        ? {
            spouse: {
              currentAge: household.spouse.currentAge,
              retirementAge: household.spouse.retirementAge,
              lifeExpectancy: household.spouse.lifeExpectancy,
            },
          }
        : {}),
    },
    accounts: anonymizedAccounts,
    incomeStreams: anonymizedIncomeStreams,
    taxes: {
      federalModel: taxes.federalModel,
      stateModel: taxes.stateModel,
      federalEffectiveRatePct: taxes.federalEffectiveRatePct,
      stateEffectiveRatePct: taxes.stateEffectiveRatePct,
      capGainsRatePct: taxes.capGainsRatePct,
    },
    simulationSummary: {
      successProbability: planResultSummary.successProbability,
      medianTerminalValue: planResultSummary.medianTerminalValue,
      worstCaseShortfall: planResultSummary.worstCaseShortfall,
    },
    userPreferences: {
      riskTolerance: sanitizeForLlm(userPreferences.riskTolerance),
      spendingFloor: userPreferences.spendingFloor,
      legacyGoal: userPreferences.legacyGoal,
    },
  };
}

export function stripTaxPii(
  request: TaxStrategyAdviceRequest,
  documents?: TaxDocument[],
): AnonymizedTaxContext {
  const { taxYear, taxYearRecord, priorYearRecord, sharedCorpus, userPreferences } = request;

  const typeCounts: Record<string, number> = {};
  const anonymizedAccounts = sharedCorpus.accounts.map((a) => {
    typeCounts[a.type] = (typeCounts[a.type] ?? 0) + 1;
    return {
      label: accountLabel(a.type, typeCounts[a.type]),
      type: sanitizeForLlm(a.type),
      currentBalance: a.currentBalance,
    };
  });

  // Anonymize documents if provided; otherwise empty array
  const anonymizedDocuments: AnonymizedTaxContext['documents'] =
    documents && documents.length > 0 ? stripDocumentsPii(documents) : [];

  const priorYear = priorYearRecord
    ? {
        taxYear: priorYearRecord.taxYear,
        income: priorYearRecord.income,
        deductions: priorYearRecord.deductions,
        credits: priorYearRecord.credits,
        payments: priorYearRecord.payments,
        computedFederalTax: priorYearRecord.computedFederalTax,
        computedStateTax: priorYearRecord.computedStateTax,
      }
    : undefined;

  return {
    taxYear,
    filingStatus: sanitizeForLlm(taxYearRecord.filingStatus),
    stateOfResidence: sanitizeForLlm(taxYearRecord.stateOfResidence),
    income: taxYearRecord.income,
    deductions: taxYearRecord.deductions,
    credits: taxYearRecord.credits,
    payments: taxYearRecord.payments,
    computedFederalTax: taxYearRecord.computedFederalTax,
    computedStateTax: taxYearRecord.computedStateTax,
    priorYear,
    documents: anonymizedDocuments,
    accounts: anonymizedAccounts,
    userPreferences: {
      prioritize: sanitizeForLlm(userPreferences.prioritize),
    },
  };
}

/**
 * Anonymize a list of TaxDocuments for inclusion in prompts.
 * Strips issuerName, sourceFileName, oneDrivePath; replaces with generic labels.
 */
export function stripDocumentsPii(
  documents: TaxDocument[],
): AnonymizedTaxContext['documents'] {
  const formTypeCounts: Record<string, number> = {};
  return documents.map((doc) => {
    formTypeCounts[doc.formType] = (formTypeCounts[doc.formType] ?? 0) + 1;
    const letterIndex = Object.values(formTypeCounts).reduce((sum, c) => sum + c, 0) - 1;
    return {
      label: `${doc.formType} Issuer ${issuerLetter(letterIndex)}`,
      formType: doc.formType,
      extractedFields: sanitizeExtractedFields(doc.extractedFields),
    };
  });
}
