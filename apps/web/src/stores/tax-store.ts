import { create } from 'zustand';
import type { TaxYearRecord, TaxDocument, ChecklistItem, Anomaly, TaxYearStatus } from '@finplanner/domain';

interface TaxState {
  taxYears: TaxYearRecord[];
  documents: TaxDocument[];
  checklistItems: ChecklistItem[];
  anomalies: Anomaly[];

  // Tax year actions
  addTaxYear: (record: TaxYearRecord) => void;
  updateTaxYear: (taxYear: number, partial: Partial<TaxYearRecord>) => void;
  removeTaxYear: (taxYear: number) => void;
  setTaxYearStatus: (taxYear: number, status: TaxYearStatus) => void;

  // Document actions
  addDocument: (doc: TaxDocument) => void;
  updateDocument: (id: string, partial: Partial<TaxDocument>) => void;
  removeDocument: (id: string) => void;

  // Checklist actions
  setChecklistItems: (items: ChecklistItem[]) => void;
  updateChecklistItem: (id: string, partial: Partial<ChecklistItem>) => void;

  // Anomaly actions
  setAnomalies: (anomalies: Anomaly[]) => void;
}

export const useTaxStore = create<TaxState>((set) => ({
  taxYears: [],
  documents: [],
  checklistItems: [],
  anomalies: [],

  addTaxYear: (record) =>
    set((state) => ({ taxYears: [...state.taxYears, record] })),
  updateTaxYear: (taxYear, partial) =>
    set((state) => ({
      taxYears: state.taxYears.map((ty) =>
        ty.taxYear === taxYear ? { ...ty, ...partial } : ty,
      ),
    })),
  removeTaxYear: (taxYear) =>
    set((state) => ({ taxYears: state.taxYears.filter((ty) => ty.taxYear !== taxYear) })),
  setTaxYearStatus: (taxYear, status) =>
    set((state) => ({
      taxYears: state.taxYears.map((ty) =>
        ty.taxYear === taxYear ? { ...ty, status } : ty,
      ),
    })),

  addDocument: (doc) =>
    set((state) => ({ documents: [...state.documents, doc] })),
  updateDocument: (id, partial) =>
    set((state) => ({
      documents: state.documents.map((d) => (d.id === id ? { ...d, ...partial } : d)),
    })),
  removeDocument: (id) =>
    set((state) => ({ documents: state.documents.filter((d) => d.id !== id) })),

  setChecklistItems: (items) => set({ checklistItems: items }),
  updateChecklistItem: (id, partial) =>
    set((state) => ({
      checklistItems: state.checklistItems.map((ci) =>
        ci.id === id ? { ...ci, ...partial } : ci,
      ),
    })),

  setAnomalies: (anomalies) => set({ anomalies }),
}));
