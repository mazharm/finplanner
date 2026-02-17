import { create } from 'zustand';
import type { TaxYearRecord, TaxDocument, ChecklistItem, Anomaly, TaxYearStatus } from '@finplanner/domain';
import { getAppState, setAppState } from '../services/indexeddb.js';

interface TaxState {
  taxYears: TaxYearRecord[];
  documents: TaxDocument[];
  checklistItems: ChecklistItem[];
  anomalies: Anomaly[];
  initialized: boolean;
  persistError: string | null;

  // Lifecycle
  initFromIndexedDB: () => Promise<void>;
  clearPersistError: () => void;

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

let _setTax: ((partial: Partial<TaxState>) => void) | null = null;

function persistTax(state: Pick<TaxState, 'taxYears' | 'documents' | 'checklistItems' | 'anomalies'>) {
  setAppState('tax', {
    taxYears: state.taxYears,
    documents: state.documents,
    checklistItems: state.checklistItems,
    anomalies: state.anomalies,
  }).catch((err) => {
    console.error('[FinPlanner] IndexedDB operation failed:', err instanceof Error ? err.message : 'Unknown error');
    _setTax?.({ persistError: 'Failed to save tax data. Changes may be lost on page refresh.' });
  });
}

export const useTaxStore = create<TaxState>((set, get) => {
  _setTax = set;
  return {
  taxYears: [],
  documents: [],
  checklistItems: [],
  anomalies: [],
  initialized: false,
  persistError: null,

  clearPersistError: () => set({ persistError: null }),

  initFromIndexedDB: async () => {
    try {
      const saved = await getAppState<{
        taxYears: TaxYearRecord[];
        documents: TaxDocument[];
        checklistItems: ChecklistItem[];
        anomalies: Anomaly[];
      }>('tax');
      if (saved) {
        set({
          taxYears: Array.isArray(saved.taxYears) ? saved.taxYears : [],
          documents: Array.isArray(saved.documents) ? saved.documents : [],
          checklistItems: Array.isArray(saved.checklistItems) ? saved.checklistItems : [],
          anomalies: Array.isArray(saved.anomalies) ? saved.anomalies : [],
          initialized: true,
        });
      } else {
        set({ initialized: true });
      }
    } catch {
      set({ initialized: true });
    }
  },

  addTaxYear: (record) => {
    set((state) => {
      const taxYears = [...state.taxYears, record];
      persistTax({ ...state, taxYears });
      return { taxYears };
    });
  },
  updateTaxYear: (taxYear, partial) => {
    set((state) => {
      const taxYears = state.taxYears.map((ty) =>
        ty.taxYear === taxYear ? { ...ty, ...partial } : ty,
      );
      persistTax({ ...state, taxYears });
      return { taxYears };
    });
  },
  removeTaxYear: (taxYear) => {
    set((state) => {
      const taxYears = state.taxYears.filter((ty) => ty.taxYear !== taxYear);
      persistTax({ ...state, taxYears });
      return { taxYears };
    });
  },
  setTaxYearStatus: (taxYear, status) => {
    set((state) => {
      const taxYears = state.taxYears.map((ty) =>
        ty.taxYear === taxYear ? { ...ty, status } : ty,
      );
      persistTax({ ...state, taxYears });
      return { taxYears };
    });
  },

  addDocument: (doc) => {
    set((state) => {
      const documents = [...state.documents, doc];
      persistTax({ ...state, documents });
      return { documents };
    });
  },
  updateDocument: (id, partial) => {
    set((state) => {
      const documents = state.documents.map((d) => (d.id === id ? { ...d, ...partial } : d));
      persistTax({ ...state, documents });
      return { documents };
    });
  },
  removeDocument: (id) => {
    set((state) => {
      const documents = state.documents.filter((d) => d.id !== id);
      persistTax({ ...state, documents });
      return { documents };
    });
  },

  setChecklistItems: (items) => {
    set((state) => {
      persistTax({ ...state, checklistItems: items });
      return { checklistItems: items };
    });
  },
  updateChecklistItem: (id, partial) => {
    set((state) => {
      const checklistItems = state.checklistItems.map((ci) =>
        ci.id === id ? { ...ci, ...partial } : ci,
      );
      persistTax({ ...state, checklistItems });
      return { checklistItems };
    });
  },

  setAnomalies: (anomalies) => {
    set((state) => {
      persistTax({ ...state, anomalies });
      return { anomalies };
    });
  },
};
});
