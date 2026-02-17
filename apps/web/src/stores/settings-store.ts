import { create } from 'zustand';
import {
  getApiKey,
  setApiKey as setApiKeyIdb,
  clearApiKey as clearApiKeyIdb,
  clearAllData as clearAllDataIdb,
} from '../services/indexeddb.js';

type SyncStatus = 'offline' | 'syncing' | 'synced' | 'error';

interface SettingsState {
  hasApiKey: boolean;
  oneDriveConnected: boolean;
  syncStatus: SyncStatus;
  initialized: boolean;

  // Actions
  initFromIndexedDB: () => Promise<void>;
  setClaudeApiKey: (key: string) => Promise<void>;
  clearClaudeApiKey: () => Promise<void>;
  clearAllData: () => Promise<void>;
  setOneDriveConnected: (connected: boolean) => void;
  setSyncStatus: (status: SyncStatus) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  hasApiKey: false,
  oneDriveConnected: false,
  syncStatus: 'offline',
  initialized: false,

  initFromIndexedDB: async () => {
    try {
      const key = await getApiKey();
      set({ hasApiKey: !!key, initialized: true });
    } catch {
      // IndexedDB not available (e.g., SSR or test environment)
      set({ initialized: true });
    }
  },

  setClaudeApiKey: async (key) => {
    if (key.length > 0 && (!key.startsWith('sk-ant-') || key.length < 30)) {
      throw new Error('Invalid API key format. Key must start with "sk-ant-" and be at least 30 characters.');
    }
    try {
      await setApiKeyIdb(key);
      set({ hasApiKey: key.length > 0 });
    } catch (err) {
      console.error('[FinPlanner] Failed to save API key to IndexedDB:', err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  },

  clearClaudeApiKey: async () => {
    try {
      await clearApiKeyIdb();
      set({ hasApiKey: false });
    } catch (err) {
      console.error('[FinPlanner] Failed to clear API key from IndexedDB:', err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  },

  clearAllData: async () => {
    try {
      await clearAllDataIdb();
      set({ hasApiKey: false, oneDriveConnected: false, syncStatus: 'offline' });
      // Force page reload to reset all in-memory store state
      window.location.reload();
    } catch (err) {
      console.error('[FinPlanner] Failed to clear all data:', err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  },

  setOneDriveConnected: (connected) => set({ oneDriveConnected: connected }),
  setSyncStatus: (status) => set({ syncStatus: status }),
}));
