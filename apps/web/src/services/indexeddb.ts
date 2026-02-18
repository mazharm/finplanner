/**
 * IndexedDB service for FinPlanner.
 *
 * Object stores:
 * - apiKey: Claude API key (single entry, key "claude")
 * - files: Cached OneDrive file content with ETags
 * - syncQueue: Pending writes during offline mode
 * - appState: Persisted store state (shared, tax, retirement)
 *
 * SECURITY NOTE: Data is stored in plaintext. For production use with
 * highly sensitive data, consider encrypting values using the Web Crypto
 * API before storing, and decrypting on retrieval.
 */

const DB_NAME = 'finplanner';
const DB_VERSION = 2;
const ENCRYPTION_ALGORITHM = 'AES-GCM';
const ENCRYPTION_KEY_STORAGE = 'finplanner_key_material';

export interface CachedFile {
  path: string;
  content: string;
  etag: string;
  savedAt: string;
}

export interface SyncQueueEntry {
  id: string;
  path: string;
  content: string;
  operation: 'write' | 'delete';
  queuedAt: string;
  retries: number;
}

// --- Encryption Helpers ---

async function getEncryptionKey(): Promise<CryptoKey> {
  let rawKey = localStorage.getItem(ENCRYPTION_KEY_STORAGE);
  if (!rawKey) {
    const keyBytes = new Uint8Array(32); // 256-bit key
    crypto.getRandomValues(keyBytes);
    // Store as base64
    rawKey = btoa(String.fromCharCode(...keyBytes));
    localStorage.setItem(ENCRYPTION_KEY_STORAGE, rawKey);
  }

  const binaryKey = Uint8Array.from(atob(rawKey), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey(
    'raw',
    binaryKey,
    { name: ENCRYPTION_ALGORITHM },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptData(data: unknown): Promise<{ iv: Uint8Array; ciphertext: ArrayBuffer } | unknown> {
  // If undefined/null, return as is
  if (data === undefined || data === null) return data;

  try {
    const key = await getEncryptionKey();
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV
    const encoded = new TextEncoder().encode(JSON.stringify(data));

    const ciphertext = await crypto.subtle.encrypt(
      { name: ENCRYPTION_ALGORITHM, iv },
      key,
      encoded
    );

    return {
      _encrypted: true,
      iv: Array.from(iv), // Store as array for IDB compatibility
      ciphertext,
    };
  } catch (err) {
    console.error('Encryption failed:', err);
    throw new Error('Failed to encrypt data');
  }
}

async function decryptData<T>(data: unknown): Promise<T> {
  if (!data || typeof data !== 'object') return data as T;
  const wrapper = data as { _encrypted?: boolean; iv: number[]; ciphertext: ArrayBuffer };

  if (!wrapper._encrypted) {
    return data as T; // Return plaintext if not encrypted (migration support)
  }

  try {
    const key = await getEncryptionKey();
    const iv = new Uint8Array(wrapper.iv);
    const decrypted = await crypto.subtle.decrypt(
      { name: ENCRYPTION_ALGORITHM, iv },
      key,
      wrapper.ciphertext
    );

    const text = new TextDecoder().decode(decrypted);
    return JSON.parse(text) as T;
  } catch (err) {
    console.error('Decryption failed:', err);
    throw new Error('Failed to decrypt data');
  }
}

/** Singleton DB connection to avoid race conditions */
let dbInstance: IDBDatabase | null = null;
let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      const oldVersion = event.oldVersion;

      if (oldVersion < 1) {
        // Initial schema: create all base stores
        db.createObjectStore('apiKey');
        db.createObjectStore('files', { keyPath: 'path' });
        db.createObjectStore('syncQueue', { keyPath: 'id' });
      }

      if (oldVersion < 2) {
        // Version 2: add appState store for persisted Zustand state
        if (!db.objectStoreNames.contains('appState')) {
          db.createObjectStore('appState');
        }
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      dbInstance.onclose = () => { dbInstance = null; dbPromise = null; };
      resolve(dbInstance);
    };
    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };
  });

  return dbPromise;
}

function txGet<T>(db: IDBDatabase, store: string, key: IDBValidKey): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

function txPut(db: IDBDatabase, store: string, value: unknown, key?: IDBValidKey): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    if (key !== undefined) {
      tx.objectStore(store).put(value, key);
    } else {
      tx.objectStore(store).put(value);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function txDelete(db: IDBDatabase, store: string, key: IDBValidKey): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function txGetAll<T>(db: IDBDatabase, store: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

// --- API Key ---

export async function getApiKey(): Promise<string | undefined> {
  const db = await openDb();
  const raw = await txGet<unknown>(db, 'apiKey', 'claude');
  return decryptData<string | undefined>(raw);
}

export async function setApiKey(key: string): Promise<void> {
  if (!key || !key.startsWith('sk-ant-') || key.length < 30) {
    throw new Error('Invalid API key format');
  }
  const db = await openDb();
  const encrypted = await encryptData(key);
  await txPut(db, 'apiKey', encrypted, 'claude');
}

export async function clearApiKey(): Promise<void> {
  const db = await openDb();
  await txDelete(db, 'apiKey', 'claude');
}

// --- File Cache ---

export async function getCachedFile(path: string): Promise<CachedFile | undefined> {
  const db = await openDb();
  return txGet<CachedFile>(db, 'files', path);
}

export async function setCachedFile(file: CachedFile): Promise<void> {
  const db = await openDb();
  await txPut(db, 'files', file);
}

export async function removeCachedFile(path: string): Promise<void> {
  const db = await openDb();
  await txDelete(db, 'files', path);
}

export async function getAllCachedFiles(): Promise<CachedFile[]> {
  const db = await openDb();
  return txGetAll<CachedFile>(db, 'files');
}

// --- Sync Queue ---

export async function addToSyncQueue(entry: SyncQueueEntry): Promise<void> {
  const db = await openDb();
  await txPut(db, 'syncQueue', entry);
}

export async function removeFromSyncQueue(id: string): Promise<void> {
  const db = await openDb();
  await txDelete(db, 'syncQueue', id);
}

export async function getSyncQueue(): Promise<SyncQueueEntry[]> {
  const db = await openDb();
  return txGetAll<SyncQueueEntry>(db, 'syncQueue');
}

// --- Clear All Data ---

export async function clearAllData(): Promise<void> {
  const db = await openDb();
  const storeNames = Array.from(db.objectStoreNames);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeNames, 'readwrite');
    for (const name of storeNames) {
      tx.objectStore(name).clear();
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

// --- App State Persistence ---

export async function getAppState<T>(key: string): Promise<T | undefined> {
  const db = await openDb();
  const raw = await txGet<unknown>(db, 'appState', key);
  return decryptData<T | undefined>(raw);
}

export async function setAppState(key: string, value: unknown): Promise<void> {
  const db = await openDb();
  const encrypted = await encryptData(value);
  await txPut(db, 'appState', encrypted, key);
}
