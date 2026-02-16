import type { PortfolioAdviceRequest, TaxStrategyAdviceRequest, TaxDocument } from '@finplanner/domain';
import type { AnonymizedPortfolioContext, AnonymizedTaxContext } from './types.js';

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
  const anonymizedAccounts = accounts.map((a) => {
    typeCounts[a.type] = (typeCounts[a.type] ?? 0) + 1;
    return {
      label: accountLabel(a.type, typeCounts[a.type]),
      type: a.type,
      owner: a.owner,
      currentBalance: a.currentBalance,
      expectedReturnPct: a.expectedReturnPct,
      feePct: a.feePct,
    };
  });

  const anonymizedIncomeStreams = otherIncome.map((s, i) => ({
    label: `Income Stream ${i + 1}`,
    owner: s.owner,
    startYear: s.startYear,
    endYear: s.endYear,
    annualAmount: s.annualAmount,
    taxable: s.taxable,
  }));

  return {
    household: {
      filingStatus: household.filingStatus,
      stateOfResidence: household.stateOfResidence,
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
      riskTolerance: userPreferences.riskTolerance,
      spendingFloor: userPreferences.spendingFloor,
      legacyGoal: userPreferences.legacyGoal,
    },
  };
}

export function stripTaxPii(request: TaxStrategyAdviceRequest): AnonymizedTaxContext {
  const { taxYear, taxYearRecord, priorYearRecord, sharedCorpus, userPreferences } = request;

  const typeCounts: Record<string, number> = {};
  const anonymizedAccounts = sharedCorpus.accounts.map((a) => {
    typeCounts[a.type] = (typeCounts[a.type] ?? 0) + 1;
    return {
      label: accountLabel(a.type, typeCounts[a.type]),
      type: a.type,
      currentBalance: a.currentBalance,
    };
  });

  // We don't have documents directly on the request; they come via taxYearRecord.documentIds
  // For the anonymized context, we accept documents passed separately or build empty array
  // The TaxStrategyAdviceRequest doesn't carry TaxDocument[] directly,
  // but the plan indicates we should handle them if present.
  // We'll provide an empty array since documents aren't on the request type.
  const anonymizedDocuments: AnonymizedTaxContext['documents'] = [];

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
    filingStatus: taxYearRecord.filingStatus,
    stateOfResidence: taxYearRecord.stateOfResidence,
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
      prioritize: userPreferences.prioritize,
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
      extractedFields: doc.extractedFields,
    };
  });
}
