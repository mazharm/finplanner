import type { TaxFormType } from '@finplanner/domain';
import type { TaxFormTemplate } from './types.js';

const TEMPLATES: TaxFormTemplate[] = [
  {
    formType: 'W-2',
    formIdentifiers: ['W-2', 'Wage and Tax Statement', 'Form W-2'],
    fields: [
      {
        key: 'wages',
        label: 'Wages, tips, other compensation',
        boxNumber: '1',
        labelPatterns: ['wages,?\\s*tips', 'box\\s*1\\b', 'compensation'],
        valueType: 'currency',
        required: true,
      },
      {
        key: 'federalTaxWithheld',
        label: 'Federal income tax withheld',
        boxNumber: '2',
        labelPatterns: ['federal\\s*(income)?\\s*tax\\s*withheld', 'box\\s*2\\b'],
        valueType: 'currency',
        required: true,
      },
      {
        key: 'ssWages',
        label: 'Social security wages',
        boxNumber: '3',
        labelPatterns: ['social\\s*security\\s*wages', 'box\\s*3\\b'],
        valueType: 'currency',
        required: false,
      },
      {
        key: 'medicareWages',
        label: 'Medicare wages and tips',
        boxNumber: '5',
        labelPatterns: ['medicare\\s*wages', 'box\\s*5\\b'],
        valueType: 'currency',
        required: false,
      },
      {
        key: 'stateWages',
        label: 'State wages, tips, etc.',
        boxNumber: '16',
        labelPatterns: ['state\\s*wages', 'box\\s*16\\b'],
        valueType: 'currency',
        required: false,
      },
      {
        key: 'stateTaxWithheld',
        label: 'State income tax',
        boxNumber: '17',
        labelPatterns: ['state\\s*(income)?\\s*tax', 'box\\s*17\\b'],
        valueType: 'currency',
        required: false,
      },
    ],
  },
  {
    formType: '1099-INT',
    formIdentifiers: ['1099-INT', 'Interest Income', 'Form 1099-INT'],
    fields: [
      {
        key: 'interestIncome',
        label: 'Interest income',
        boxNumber: '1',
        labelPatterns: ['interest\\s*income', 'box\\s*1\\b'],
        valueType: 'currency',
        required: true,
      },
      {
        key: 'taxExemptInterest',
        label: 'Tax-exempt interest',
        boxNumber: '8',
        labelPatterns: ['tax[\\s-]*exempt\\s*interest', 'box\\s*8\\b'],
        valueType: 'currency',
        required: false,
      },
    ],
  },
  {
    formType: '1099-DIV',
    formIdentifiers: ['1099-DIV', 'Dividends and Distributions', 'Form 1099-DIV'],
    fields: [
      {
        key: 'ordinaryDividends',
        label: 'Total ordinary dividends',
        boxNumber: '1a',
        labelPatterns: ['total\\s*ordinary\\s*dividends', 'box\\s*1a\\b', 'ordinary\\s*dividends'],
        valueType: 'currency',
        required: true,
      },
      {
        key: 'qualifiedDividends',
        label: 'Qualified dividends',
        boxNumber: '1b',
        labelPatterns: ['qualified\\s*dividends', 'box\\s*1b\\b'],
        valueType: 'currency',
        required: false,
      },
      {
        key: 'capitalGainDistributions',
        label: 'Total capital gain distr.',
        boxNumber: '2a',
        labelPatterns: ['total\\s*capital\\s*gain', 'capital\\s*gain\\s*distr', 'box\\s*2a\\b'],
        valueType: 'currency',
        required: false,
      },
    ],
  },
  {
    formType: '1099-R',
    formIdentifiers: [
      '1099-R',
      'Distributions From Pensions',
      'Distributions From Pensions, Annuities, Retirement',
      'Form 1099-R',
    ],
    fields: [
      {
        key: 'grossDistribution',
        label: 'Gross distribution',
        boxNumber: '1',
        labelPatterns: ['gross\\s*distribution', 'box\\s*1\\b'],
        valueType: 'currency',
        required: true,
      },
      {
        key: 'taxableAmount',
        label: 'Taxable amount',
        boxNumber: '2a',
        labelPatterns: ['taxable\\s*amount', 'box\\s*2a\\b'],
        valueType: 'currency',
        required: true,
      },
      {
        key: 'distributionCode',
        label: 'Distribution code(s)',
        boxNumber: '7',
        labelPatterns: ['distribution\\s*code', 'box\\s*7\\b'],
        valueType: 'code',
        required: false,
      },
    ],
  },
  {
    formType: '1099-B',
    formIdentifiers: [
      '1099-B',
      'Proceeds From Broker',
      'Proceeds From Broker and Barter Exchange Transactions',
      'Form 1099-B',
    ],
    fields: [
      {
        key: 'proceeds',
        label: 'Proceeds',
        boxNumber: '1d',
        labelPatterns: ['proceeds', 'sales\\s*price', 'box\\s*1d\\b'],
        valueType: 'currency',
        required: true,
      },
      {
        key: 'costBasis',
        label: 'Cost or other basis',
        boxNumber: '1e',
        labelPatterns: ['cost\\s*(or\\s*other)?\\s*basis', 'box\\s*1e\\b'],
        valueType: 'currency',
        required: true,
      },
      {
        key: 'gainLoss',
        label: 'Gain or (loss)',
        boxNumber: '1g',
        labelPatterns: ['gain\\s*(or)?\\s*\\(?loss\\)?', 'box\\s*1g\\b'],
        valueType: 'currency',
        required: false,
      },
    ],
  },
  {
    formType: '1099-MISC',
    formIdentifiers: [
      '1099-MISC',
      'Miscellaneous Income',
      'Miscellaneous Information',
      'Form 1099-MISC',
    ],
    fields: [
      {
        key: 'rents',
        label: 'Rents',
        boxNumber: '1',
        labelPatterns: ['rents', 'box\\s*1\\b'],
        valueType: 'currency',
        required: false,
      },
      {
        key: 'royalties',
        label: 'Royalties',
        boxNumber: '2',
        labelPatterns: ['royalties', 'box\\s*2\\b'],
        valueType: 'currency',
        required: false,
      },
      {
        key: 'otherIncome',
        label: 'Other income',
        boxNumber: '3',
        labelPatterns: ['other\\s*income', 'box\\s*3\\b'],
        valueType: 'currency',
        required: false,
      },
      {
        key: 'federalTaxWithheld',
        label: 'Federal income tax withheld',
        boxNumber: '4',
        labelPatterns: ['federal\\s*(income)?\\s*tax\\s*withheld', 'box\\s*4\\b'],
        valueType: 'currency',
        required: false,
      },
    ],
  },
  {
    formType: '1099-NEC',
    formIdentifiers: ['1099-NEC', 'Nonemployee Compensation', 'Form 1099-NEC'],
    fields: [
      {
        key: 'nonemployeeCompensation',
        label: 'Nonemployee compensation',
        boxNumber: '1',
        labelPatterns: ['nonemployee\\s*compensation', 'box\\s*1\\b'],
        valueType: 'currency',
        required: true,
      },
    ],
  },
  {
    formType: 'K-1',
    formIdentifiers: [
      'Schedule K-1',
      'K-1',
      "Partner's Share",
      "Shareholder's Share",
      "Beneficiary's Share",
      'Form K-1',
    ],
    fields: [
      {
        key: 'ordinaryIncome',
        label: 'Ordinary business income (loss)',
        boxNumber: '1',
        labelPatterns: ['ordinary\\s*(business)?\\s*income', 'box\\s*1\\b'],
        valueType: 'currency',
        required: false,
      },
      {
        key: 'rentalIncome',
        label: 'Net rental real estate income (loss)',
        boxNumber: '2',
        labelPatterns: ['net\\s*rental', 'rental\\s*(real\\s*estate)?\\s*income', 'box\\s*2\\b'],
        valueType: 'currency',
        required: false,
      },
      {
        key: 'interestIncome',
        label: 'Interest income',
        boxNumber: '5',
        labelPatterns: ['interest\\s*income', 'box\\s*5\\b'],
        valueType: 'currency',
        required: false,
      },
      {
        key: 'dividendIncome',
        label: 'Dividends',
        boxNumber: '6a',
        labelPatterns: ['dividends', 'ordinary\\s*dividends', 'box\\s*6a\\b'],
        valueType: 'currency',
        required: false,
      },
      {
        key: 'capitalGains',
        label: 'Net short-term / long-term capital gain (loss)',
        boxNumber: '8-9a',
        labelPatterns: ['capital\\s*gain', 'net\\s*(short|long)[\\s-]*term', 'box\\s*[89]\\b'],
        valueType: 'currency',
        required: false,
      },
    ],
  },
  {
    formType: '1098',
    formIdentifiers: ['1098', 'Mortgage Interest Statement', 'Form 1098'],
    fields: [
      {
        key: 'mortgageInterest',
        label: 'Mortgage interest received from payer(s)/borrower(s)',
        boxNumber: '1',
        labelPatterns: ['mortgage\\s*interest', 'box\\s*1\\b'],
        valueType: 'currency',
        required: true,
      },
      {
        key: 'propertyTax',
        label: 'Real estate tax',
        boxNumber: '10',
        labelPatterns: ['real\\s*estate\\s*tax', 'property\\s*tax', 'box\\s*10\\b'],
        valueType: 'currency',
        required: false,
      },
    ],
  },
];

export function getTemplates(): TaxFormTemplate[] {
  return TEMPLATES;
}

export function getTemplateByFormType(formType: TaxFormType): TaxFormTemplate | undefined {
  return TEMPLATES.find((t) => t.formType === formType);
}
