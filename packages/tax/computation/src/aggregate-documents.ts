import type { TaxDocument, TaxYearIncome, TaxYearPayments } from '@finplanner/domain';

export interface AggregatedDocumentData {
  income: TaxYearIncome;
  payments: TaxYearPayments;
}

function getNum(fields: Record<string, number | string>, key: string): number {
  const val = fields[key];
  return typeof val === 'number' ? val : 0;
}

export function aggregateDocumentsToIncome(documents: TaxDocument[]): AggregatedDocumentData {
  const income: TaxYearIncome = {
    wages: 0,
    selfEmploymentIncome: 0,
    interestIncome: 0,
    dividendIncome: 0,
    qualifiedDividends: 0,
    capitalGains: 0,
    capitalLosses: 0,
    rentalIncome: 0,
    nqdcDistributions: 0,
    retirementDistributions: 0,
    socialSecurityIncome: 0,
    otherIncome: 0,
  };
  const payments: TaxYearPayments = {
    federalWithheld: 0,
    stateWithheld: 0,
    estimatedPaymentsFederal: 0,
    estimatedPaymentsState: 0,
  };

  for (const doc of documents) {
    const f = doc.extractedFields;
    switch (doc.formType) {
      case 'W-2':
        income.wages += getNum(f, 'wages');
        payments.federalWithheld += getNum(f, 'federalTaxWithheld');
        payments.stateWithheld += getNum(f, 'stateTaxWithheld');
        break;
      case '1099-INT':
        income.interestIncome += getNum(f, 'interestIncome');
        payments.federalWithheld += getNum(f, 'federalTaxWithheld');
        break;
      case '1099-DIV':
        income.dividendIncome += getNum(f, 'ordinaryDividends');
        income.qualifiedDividends += getNum(f, 'qualifiedDividends');
        income.capitalGains += getNum(f, 'capitalGainDistributions');
        payments.federalWithheld += getNum(f, 'federalTaxWithheld');
        break;
      case '1099-R':
        income.retirementDistributions += getNum(f, 'taxableAmount');
        payments.federalWithheld += getNum(f, 'federalTaxWithheld');
        payments.stateWithheld += getNum(f, 'stateTaxWithheld');
        break;
      case '1099-B': {
        let gainLoss = getNum(f, 'gainLoss');
        // Fallback: compute from proceeds and costBasis when gainLoss is 0
        if (gainLoss === 0) {
          const proceeds = getNum(f, 'proceeds');
          const costBasis = getNum(f, 'costBasis');
          if (proceeds !== 0 || costBasis !== 0) {
            gainLoss = proceeds - costBasis;
          }
        }
        if (gainLoss >= 0) {
          income.capitalGains += gainLoss;
        } else {
          income.capitalLosses += Math.abs(gainLoss);
        }
        break;
      }
      case '1099-MISC':
        income.rentalIncome += getNum(f, 'rents');
        income.otherIncome += getNum(f, 'otherIncome') + getNum(f, 'royalties');
        payments.federalWithheld += getNum(f, 'federalTaxWithheld');
        break;
      case '1099-NEC':
        income.selfEmploymentIncome += getNum(f, 'nonemployeeCompensation');
        break;
      case 'K-1': {
        income.otherIncome += getNum(f, 'ordinaryIncome');
        income.rentalIncome += getNum(f, 'rentalIncome');
        income.interestIncome += getNum(f, 'interestIncome');
        income.dividendIncome += getNum(f, 'dividendIncome');
        income.qualifiedDividends += getNum(f, 'qualifiedDividends');
        // K-1 Box 8 (short-term) and Box 9 (long-term) are separate fields;
        // also support legacy combined 'capitalGains' field for backward compat
        const k1ShortTerm = getNum(f, 'shortTermCapitalGains');
        const k1LongTerm = getNum(f, 'longTermCapitalGains');
        const k1Legacy = getNum(f, 'capitalGains');
        const k1CapGains = k1ShortTerm + k1LongTerm + k1Legacy;
        if (k1CapGains >= 0) {
          income.capitalGains += k1CapGains;
        } else {
          income.capitalLosses += Math.abs(k1CapGains);
        }
        break;
      }
      // 1098 and 'other' don't map to income/payments
    }
  }

  return { income, payments };
}
