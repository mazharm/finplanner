import type { TaxDocument, TaxYearIncome, TaxYearPayments } from '@finplanner/domain';

export interface AggregatedDocumentData {
  income: Partial<TaxYearIncome>;
  payments: Partial<TaxYearPayments>;
}

function getNum(fields: Record<string, number | string>, key: string): number {
  const val = fields[key];
  return typeof val === 'number' ? val : 0;
}

export function aggregateDocumentsToIncome(documents: TaxDocument[]): AggregatedDocumentData {
  const income: Partial<TaxYearIncome> = {};
  const payments: Partial<TaxYearPayments> = {};

  for (const doc of documents) {
    const f = doc.extractedFields;
    switch (doc.formType) {
      case 'W-2':
        income.wages = (income.wages ?? 0) + getNum(f, 'wages');
        payments.federalWithheld = (payments.federalWithheld ?? 0) + getNum(f, 'federalTaxWithheld');
        payments.stateWithheld = (payments.stateWithheld ?? 0) + getNum(f, 'stateTaxWithheld');
        break;
      case '1099-INT':
        income.interestIncome = (income.interestIncome ?? 0) + getNum(f, 'interestIncome');
        break;
      case '1099-DIV':
        income.dividendIncome = (income.dividendIncome ?? 0) + getNum(f, 'ordinaryDividends');
        income.qualifiedDividends = (income.qualifiedDividends ?? 0) + getNum(f, 'qualifiedDividends');
        income.capitalGains = (income.capitalGains ?? 0) + getNum(f, 'capitalGainDistributions');
        break;
      case '1099-R':
        income.retirementDistributions = (income.retirementDistributions ?? 0) + getNum(f, 'taxableAmount');
        break;
      case '1099-B': {
        const gainLoss = getNum(f, 'gainLoss');
        if (gainLoss >= 0) {
          income.capitalGains = (income.capitalGains ?? 0) + gainLoss;
        } else {
          income.capitalLosses = (income.capitalLosses ?? 0) + Math.abs(gainLoss);
        }
        break;
      }
      case '1099-MISC':
        income.rentalIncome = (income.rentalIncome ?? 0) + getNum(f, 'rents');
        income.otherIncome = (income.otherIncome ?? 0) + getNum(f, 'otherIncome');
        break;
      case '1099-NEC':
        income.selfEmploymentIncome = (income.selfEmploymentIncome ?? 0) + getNum(f, 'nonemployeeCompensation');
        break;
      case 'K-1':
        income.otherIncome = (income.otherIncome ?? 0) + getNum(f, 'ordinaryIncome');
        income.rentalIncome = (income.rentalIncome ?? 0) + getNum(f, 'rentalIncome');
        income.interestIncome = (income.interestIncome ?? 0) + getNum(f, 'interestIncome');
        income.dividendIncome = (income.dividendIncome ?? 0) + getNum(f, 'dividendIncome');
        income.capitalGains = (income.capitalGains ?? 0) + getNum(f, 'capitalGains');
        break;
      // 1098 and 'other' don't map to income/payments
    }
  }

  return { income, payments };
}
