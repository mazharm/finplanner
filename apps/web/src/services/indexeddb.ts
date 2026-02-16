/**
 * IndexedDB service for FinPlanner.
 *
 * Object stores:
 * - apiKey: Claude API key (single entry, key "claude")
 * - files: Cached OneDrive file content with ETags
 * - syncQueue: Pending writes during offline mode
 */

const DB_NAME = 'finplanner';
const DB_VERSION = 1;

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

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('apiKey')) {
        db.createObjectStore('apiKey');
      }
      if (!db.objectStoreNames.contains('files')) {
        db.createObjectStore('files', { keyPath: 'path' });
      }
      if (!db.objectStoreNames.contains('syncQueue')) {
        db.createObjectStore('syncQueue', { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
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
    const req = key !== undefined
      ? tx.objectStore(store).put(value, key)
      : tx.objectStore(store).put(value);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function txDelete(db: IDBDatabase, store: string, key: IDBValidKey): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
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
  try {
    return await txGet<string>(db, 'apiKey', 'claude');
  } finally {
    db.close();
  }
}

export async function setApiKey(key: string): Promise<void> {
  const db = await openDb();
  try {
    await txPut(db, 'apiKey', key, 'claude');
  } finally {
    db.close();
  }
}

export async function clearApiKey(): Promise<void> {
  const db = await openDb();
  try {
    await txDelete(db, 'apiKey', 'claude');
  } finally {
    db.close();
  }
}

// --- File Cache ---

export async function getCachedFile(path: string): Promise<CachedFile | undefined> {
  const db = await openDb();
  try {
    return await txGet<CachedFile>(db, 'files', path);
  } finally {
    db.close();
  }
}

export async function setCachedFile(file: CachedFile): Promise<void> {
  const db = await openDb();
  try {
    await txPut(db, 'files', file);
  } finally {
    db.close();
  }
}

export async function removeCachedFile(path: string): Promise<void> {
  const db = await openDb();
  try {
    await txDelete(db, 'files', path);
  } finally {
    db.close();
  }
}

export async function getAllCachedFiles(): Promise<CachedFile[]> {
  const db = await openDb();
  try {
    return await txGetAll<CachedFile>(db, 'files');
  } finally {
    db.close();
  }
}

// --- Sync Queue ---

export async function addToSyncQueue(entry: SyncQueueEntry): Promise<void> {
  const db = await openDb();
  try {
    await txPut(db, 'syncQueue', entry);
  } finally {
    db.close();
  }
}

export async function removeFromSyncQueue(id: string): Promise<void> {
  const db = await openDb();
  try {
    await txDelete(db, 'syncQueue', id);
  } finally {
    db.close();
  }
}

export async function getSyncQueue(): Promise<SyncQueueEntry[]> {
  const db = await openDb();
  try {
    return await txGetAll<SyncQueueEntry>(db, 'syncQueue');
  } finally {
    db.close();
  }
}
