/**
 * Sync service for FinPlanner.
 *
 * Coordinates data persistence between:
 * - In-memory Zustand stores (working state)
 * - IndexedDB (fast offline cache)
 * - OneDrive (durable cloud storage)
 *
 * Write flow: Store → IndexedDB (immediate) → OneDrive (async background)
 * Read flow: IndexedDB cache → fallback to OneDrive → update cache
 */

import type { OneDriveClient, OneDriveFileInfo } from './onedrive.js';
import {
  setCachedFile,
  getCachedFile,
  addToSyncQueue,
  getSyncQueue,
  removeFromSyncQueue,
} from './indexeddb.js';
import type { CachedFile, SyncQueueEntry } from './indexeddb.js';

export type SyncStatus = 'offline' | 'syncing' | 'synced' | 'error';

export interface SyncResult {
  status: SyncStatus;
  filesWritten: number;
  errors: string[];
}

/**
 * Write a file locally (IndexedDB cache) and queue for OneDrive sync.
 */
export async function writeFileLocally(
  path: string,
  content: string,
): Promise<void> {
  const now = new Date().toISOString();

  // Write to IndexedDB cache
  await setCachedFile({
    path,
    content,
    etag: '',
    savedAt: now,
  });

  // Queue for OneDrive sync
  await addToSyncQueue({
    id: `sync_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    path,
    content,
    operation: 'write',
    queuedAt: now,
    retries: 0,
  });
}

/**
 * Read a file from cache, falling back to OneDrive.
 */
export async function readFile(
  path: string,
  oneDrive?: OneDriveClient,
): Promise<string | null> {
  // Try IndexedDB cache first
  const cached = await getCachedFile(path);
  if (cached) {
    return cached.content;
  }

  // Fallback to OneDrive
  if (oneDrive?.isAuthenticated()) {
    const remote = await oneDrive.readFile(path);
    if (remote) {
      // Update cache
      await setCachedFile({
        path: remote.path,
        content: remote.content,
        etag: remote.etag,
        savedAt: remote.lastModified,
      });
      return remote.content;
    }
  }

  return null;
}

/**
 * Process the sync queue — push pending writes to OneDrive.
 * Returns sync result with status and file count.
 */
export async function processSyncQueue(
  oneDrive: OneDriveClient,
): Promise<SyncResult> {
  if (!oneDrive.isAuthenticated()) {
    return { status: 'offline', filesWritten: 0, errors: [] };
  }

  const queue = await getSyncQueue();
  if (queue.length === 0) {
    return { status: 'synced', filesWritten: 0, errors: [] };
  }

  let filesWritten = 0;
  const errors: string[] = [];

  for (const entry of queue) {
    try {
      if (entry.operation === 'write') {
        const result = await oneDrive.writeFile(entry.path, entry.content);
        // Update cache with remote etag
        await setCachedFile({
          path: entry.path,
          content: entry.content,
          etag: result.etag,
          savedAt: result.lastModified,
        });
      } else if (entry.operation === 'delete') {
        await oneDrive.deleteFile(entry.path);
      }

      await removeFromSyncQueue(entry.id);
      filesWritten++;
    } catch (err) {
      const message = `Failed to sync ${entry.path}: ${String(err)}`;
      errors.push(message);

      // Retry with exponential backoff (max 5 retries)
      if (entry.retries < 5) {
        await addToSyncQueue({ ...entry, retries: entry.retries + 1 });
        await removeFromSyncQueue(entry.id);
      }
    }
  }

  return {
    status: errors.length > 0 ? 'error' : 'synced',
    filesWritten,
    errors,
  };
}

/**
 * Initialize the OneDrive folder structure for a new FinPlanner instance.
 */
export async function initializeOneDriveFolder(
  oneDrive: OneDriveClient,
): Promise<void> {
  const folders = [
    'FinPlanner',
    'FinPlanner/.agent',
    'FinPlanner/.agent/schemas',
    'FinPlanner/shared',
    'FinPlanner/tax',
    'FinPlanner/retirement',
    'FinPlanner/retirement/results',
    'FinPlanner/imports',
  ];

  for (const folder of folders) {
    await oneDrive.createFolder(folder);
  }
}

/**
 * Detect conflicts between local and remote versions.
 */
export async function detectConflict(
  path: string,
  oneDrive: OneDriveClient,
): Promise<{ hasConflict: boolean; localEtag: string; remoteEtag: string | null }> {
  const cached = await getCachedFile(path);
  const localEtag = cached?.etag ?? '';

  const remoteEtag = await oneDrive.getEtag(path);

  return {
    hasConflict: localEtag !== '' && remoteEtag !== null && localEtag !== remoteEtag,
    localEtag,
    remoteEtag,
  };
}
