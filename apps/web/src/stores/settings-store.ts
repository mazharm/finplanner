import { create } from 'zustand';
import {
  getApiKey,
  setApiKey as setApiKeyIdb,
  clearApiKey as clearApiKeyIdb,
} from '../services/indexeddb.js';

type SyncStatus = 'offline' | 'syncing' | 'synced' | 'error';

interface SettingsState {
  claudeApiKey: string;
  hasApiKey: boolean;
  oneDriveConnected: boolean;
  syncStatus: SyncStatus;
  initialized: boolean;

  // Actions
  initFromIndexedDB: () => Promise<void>;
  setClaudeApiKey: (key: string) => void;
  clearClaudeApiKey: () => void;
  setOneDriveConnected: (connected: boolean) => void;
  setSyncStatus: (status: SyncStatus) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  claudeApiKey: '',
  hasApiKey: false,
  oneDriveConnected: false,
  syncStatus: 'offline',
  initialized: false,

  initFromIndexedDB: async () => {
    try {
      const key = await getApiKey();
      if (key) {
        set({ claudeApiKey: key, hasApiKey: true, initialized: true });
      } else {
        set({ initialized: true });
      }
    } catch {
      // IndexedDB not available (e.g., SSR or test environment)
      set({ initialized: true });
    }
  },

  setClaudeApiKey: (key) => {
    set({ claudeApiKey: key, hasApiKey: key.length > 0 });
    // Persist to IndexedDB (fire-and-forget)
    setApiKeyIdb(key).catch((err) => {
      console.error('[FinPlanner] IndexedDB operation failed:', err);
    });
  },

  clearClaudeApiKey: () => {
    set({ claudeApiKey: '', hasApiKey: false });
    clearApiKeyIdb().catch((err) => {
      console.error('[FinPlanner] IndexedDB operation failed:', err);
    });
  },

  setOneDriveConnected: (connected) => set({ oneDriveConnected: connected }),
  setSyncStatus: (status) => set({ syncStatus: status }),
}));
