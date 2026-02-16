export type { TaxComputationConfig, TaxComputationResult } from './types.js';
export type { AggregatedDocumentData } from './aggregate-documents.js';
export { computeTaxableSS } from './ss-taxation.js';
export { lookupState } from './state-tax-lookup.js';
export { computeTotalGrossIncome, computeOrdinaryIncome, computeDeduction } from './income-helpers.js';
export { computeTaxYearTaxes } from './compute-tax.js';
export { aggregateDocumentsToIncome } from './aggregate-documents.js';
