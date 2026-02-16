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

const MAX_RETRIES = 5;

/**
 * Check whether a sync queue entry should be skipped due to exponential backoff.
 * Backoff delay: 2^retries * 1000ms (1s, 2s, 4s, 8s, 16s).
 */
function shouldSkipForBackoff(entry: SyncQueueEntry): boolean {
  if (entry.retries === 0) return false;
  const backoffMs = Math.pow(2, entry.retries) * 1000;
  const queuedAt = new Date(entry.queuedAt).getTime();
  return Date.now() - queuedAt < backoffMs;
}

/**
 * Process the sync queue — push pending writes to OneDrive.
 * Returns sync result with status and file count.
 *
 * Failed entries are retained in the queue with an incremented retry
 * counter and exponential backoff. After MAX_RETRIES (5), the entry is
 * permanently removed and the failure is reported.
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
    // Skip entries that are still in their backoff window
    if (shouldSkipForBackoff(entry)) {
      continue;
    }

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
      const message = `Failed to sync ${entry.path} (attempt ${entry.retries + 1}/${MAX_RETRIES}): ${String(err)}`;
      errors.push(message);
      console.error('[FinPlanner] Sync error:', message);

      // Remove the old entry
      await removeFromSyncQueue(entry.id);

      if (entry.retries < MAX_RETRIES) {
        // Re-queue with incremented retry count and fresh timestamp for backoff
        await addToSyncQueue({
          ...entry,
          id: `sync_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          retries: entry.retries + 1,
          queuedAt: new Date().toISOString(),
        });
      } else {
        console.error(`[FinPlanner] Permanently failed to sync ${entry.path} after ${MAX_RETRIES} retries`);
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
