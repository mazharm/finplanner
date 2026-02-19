import type { ChecklistItem, TaxChecklist } from '@finplanner/domain';
import { issuerNamesMatch } from '@finplanner/domain';
import type { ChecklistRequest } from './types.js';

export function generateChecklist(request: ChecklistRequest): TaxChecklist {
  const items: ChecklistItem[] = [];
  let index = 0;

  const makeId = () => `checklist-${request.taxYear}-${index++}`;

  // Rule 1: Prior-year document match
  for (const priorDoc of request.priorYearDocuments) {
    const matchingCurrent = request.currentYearDocuments.find(
      d => d.formType === priorDoc.formType && issuerNamesMatch(d.issuerName, priorDoc.issuerName)
    );

    items.push({
      id: makeId(),
      taxYear: request.taxYear,
      category: 'document',
      description: `${priorDoc.formType} from ${priorDoc.issuerName}`,
      status: matchingCurrent ? 'received' : 'pending',
      sourceReasoning: `Prior year (${priorDoc.taxYear}) included ${priorDoc.formType} from ${priorDoc.issuerName}`,
      linkedDocumentId: matchingCurrent?.id,
    });
  }

  // Rule 2: Corpus account income
  for (const account of request.sharedCorpus.accounts) {
    if (account.type === 'taxable' && account.currentBalance > 0) {
      items.push({
        id: makeId(),
        taxYear: request.taxYear,
        category: 'income',
        description: `1099-INT/1099-DIV expected from ${account.name}`,
        status: 'pending',
        sourceReasoning: `Taxable account "${account.name}" has balance > $0`,
      });
    }
  }

  // Rule 2b: Tax-deferred and Roth accounts may generate 1099-R forms
  // Only generate if: (a) prior year had a 1099-R from this issuer, OR (b) owner is at/past RMD age
  // SECURE 2.0 Act: born ≤1950→72, born 1951-1959→73, born 1960+→75
  const getRmdAge = (birthYear: number) => birthYear <= 1950 ? 72 : birthYear <= 1959 ? 73 : 75;
  for (const account of request.sharedCorpus.accounts) {
    if (account.type === 'taxDeferred') {
      // Check (a): prior year had a 1099-R from this account's issuer
      const priorHad1099R = request.priorYearDocuments.some(
        d => d.formType === '1099-R' && issuerNamesMatch(d.issuerName, account.name)
      );

      // Check (b): account owner is at or past RMD age
      const owner = account.owner === 'spouse'
        ? request.sharedCorpus.household.spouse
        : request.sharedCorpus.household.primary;
      let atRmdAge = false;
      let ownerAge = 0;
      let ownerRmdAge = 73;
      if (owner) {
        ownerAge = request.taxYear - owner.birthYear;
        ownerRmdAge = getRmdAge(owner.birthYear);
        atRmdAge = ownerAge >= ownerRmdAge;
      } else {
        console.warn(`[FinPlanner] Checklist: account "${account.name}" references "${account.owner}" but no such person in household`);
      }

      if (!priorHad1099R && !atRmdAge) continue;

      const has1099R = request.currentYearDocuments.some(
        d => d.formType === '1099-R' && issuerNamesMatch(d.issuerName, account.name)
      );
      const reason = priorHad1099R
        ? `Prior year included 1099-R from "${account.name}"`
        : `Account owner age ${ownerAge} is at/past RMD age (${ownerRmdAge})`;
      items.push({
        id: makeId(),
        taxYear: request.taxYear,
        category: 'document',
        description: `1099-R expected from retirement account: ${account.name}`,
        status: has1099R ? 'received' : 'pending',
        sourceReasoning: reason,
      });
    }
  }

  // Rule 2c: Deferred compensation accounts generate W-2 supplements
  for (const account of request.sharedCorpus.accounts) {
    if (account.type === 'deferredComp' && account.currentBalance > 0) {
      items.push({
        id: makeId(),
        taxYear: request.taxYear,
        category: 'income',
        description: `W-2 supplement expected for deferred compensation from ${account.name}`,
        status: 'pending',
        sourceReasoning: `Deferred compensation account "${account.name}" has balance > $0; distributions appear on W-2`,
      });
    }
  }

  // Rule 3: Corpus income stream
  for (const stream of request.sharedCorpus.incomeStreams) {
    if (stream.startYear <= request.taxYear && (!stream.endYear || stream.endYear >= request.taxYear)) {
      items.push({
        id: makeId(),
        taxYear: request.taxYear,
        category: 'income',
        description: `${stream.name} income expected`,
        status: 'pending',
        sourceReasoning: `Income stream "${stream.name}" active in ${request.taxYear}`,
      });
    }
  }

  // Rule 4: Prior-year deduction carryover
  if (request.priorYearRecord?.deductions.useItemized && request.priorYearRecord.deductions.itemizedDeductions) {
    const itemized = request.priorYearRecord.deductions.itemizedDeductions;
    const deductionTypes: Array<{ key: keyof typeof itemized; label: string }> = [
      { key: 'mortgageInterest', label: 'mortgage interest' },
      { key: 'stateAndLocalTaxes', label: 'state and local taxes' },
      { key: 'charitableContributions', label: 'charitable contributions' },
      { key: 'medicalExpenses', label: 'medical expenses' },
      { key: 'other', label: 'other' },
    ];
    for (const dt of deductionTypes) {
      if (itemized[dt.key] > 0) {
        items.push({
          id: makeId(),
          taxYear: request.taxYear,
          category: 'deduction',
          description: `Review ${dt.label} deduction`,
          status: 'pending',
          sourceReasoning: `Prior year (${request.priorYearRecord.taxYear}) had $${itemized[dt.key].toLocaleString('en-US')} in ${dt.label}`,
        });
      }
    }
  }

  // Rule 5: Filing status change
  if (request.priorYearRecord && request.priorYearRecord.filingStatus !== request.currentYearRecord.filingStatus) {
    items.push({
      id: makeId(),
      taxYear: request.taxYear,
      category: 'life_event',
      description: 'Filing status changed -- verify',
      status: 'pending',
      sourceReasoning: `Filing status changed from "${request.priorYearRecord.filingStatus}" to "${request.currentYearRecord.filingStatus}"`,
    });
  }

  // Rule 6: State change
  if (request.priorYearRecord && request.priorYearRecord.stateOfResidence !== request.currentYearRecord.stateOfResidence) {
    items.push({
      id: makeId(),
      taxYear: request.taxYear,
      category: 'life_event',
      description: 'State changed -- review',
      status: 'pending',
      sourceReasoning: `State changed from "${request.priorYearRecord.stateOfResidence}" to "${request.currentYearRecord.stateOfResidence}"`,
    });
  }

  // Rule 7: Filing deadline (always)
  items.push({
    id: makeId(),
    taxYear: request.taxYear,
    category: 'deadline',
    description: `Federal filing deadline: April 15, ${request.taxYear + 1}`,
    status: 'pending',
    sourceReasoning: 'Standard federal filing deadline',
  });

  // Rule 8: Estimated tax payment reminders (if prior year had estimated payments)
  if (request.priorYearRecord &&
    (request.priorYearRecord.payments.estimatedPaymentsFederal > 0 ||
     request.priorYearRecord.payments.estimatedPaymentsState > 0)) {
    const quarters = [
      { label: 'Q1', date: `April 15, ${request.taxYear}` },
      { label: 'Q2', date: `June 15, ${request.taxYear}` },
      { label: 'Q3', date: `September 15, ${request.taxYear}` },
      { label: 'Q4', date: `January 15, ${request.taxYear + 1}` },
    ];
    for (const q of quarters) {
      items.push({
        id: makeId(),
        taxYear: request.taxYear,
        category: 'deadline',
        description: `${q.label} estimated tax payment due ${q.date}`,
        status: 'pending',
        sourceReasoning: `Prior year included estimated tax payments (federal: $${request.priorYearRecord.payments.estimatedPaymentsFederal.toLocaleString('en-US')}, state: $${request.priorYearRecord.payments.estimatedPaymentsState.toLocaleString('en-US')})`,
      });
    }
  }

  // Compute completionPct
  const completedCount = items.filter(i => i.status !== 'pending').length;
  const completionPct = items.length > 0 ? (completedCount / items.length) * 100 : 100;

  return {
    taxYear: request.taxYear,
    generatedAt: new Date().toISOString(),
    items,
    completionPct,
  };
}
