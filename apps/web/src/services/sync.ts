/**
 * Sync service for FinPlanner.
 *
 * Coordinates data persistence between:
 * - In-memory Zustand stores (working state)
 * - IndexedDB (fast offline cache)
 * - OneDrive (durable cloud storage)
 *
 * Write flow: Store -> IndexedDB (immediate) -> OneDrive (async background)
 * Read flow: IndexedDB cache -> fallback to OneDrive -> update cache
 */

import type { OneDriveClient } from './onedrive.js';
import {
  setCachedFile,
  getCachedFile,
  addToSyncQueue,
  getSyncQueue,
  removeFromSyncQueue,
} from './indexeddb.js';
import type { SyncQueueEntry } from './indexeddb.js';

export type SyncStatus = 'offline' | 'syncing' | 'synced' | 'error';

export interface PermanentlyFailedEntry {
  path: string;
  lastError: string;
}

export interface ConflictEntry {
  path: string;
  localContent: string;
  remoteContent: string;
  localEtag: string;
  remoteEtag: string;
}

export interface SyncResult {
  status: SyncStatus;
  filesWritten: number;
  errors: string[];
  permanentlyFailed: PermanentlyFailedEntry[];
  conflicts: ConflictEntry[];
}

/**
 * Write a file locally (IndexedDB cache) and queue for OneDrive sync.
 * Deduplicates: if a pending write for the same path already exists, it is
 * replaced with the new content instead of creating a duplicate entry.
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

  // Check for existing queue entry for this path and remove it
  const existingQueue = await getSyncQueue();
  const existingEntry = existingQueue.find(
    (e) => e.path === path && e.operation === 'write',
  );
  if (existingEntry) {
    await removeFromSyncQueue(existingEntry.id);
  }

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
const MAX_BACKOFF_MS = 60_000;

/**
 * Compute deterministic exponential backoff delay with jitter.
 *
 * Uses a seeded jitter approach: the jitter is derived from the entry ID
 * so that the same entry always produces the same backoff window per retry,
 * avoiding non-deterministic skipping behavior.
 *
 * Backoff delay: min(2^retries * 1000 + deterministic_jitter, MAX_BACKOFF_MS).
 */
function computeBackoffMs(entry: SyncQueueEntry): number {
  // Derive a deterministic jitter from the entry id (0..999ms)
  let hash = 0;
  for (let i = 0; i < entry.id.length; i++) {
    hash = ((hash << 5) - hash + entry.id.charCodeAt(i)) | 0;
  }
  const deterministicJitter = Math.abs(hash % 1000);
  return Math.min(Math.pow(2, entry.retries) * 1000 + deterministicJitter, MAX_BACKOFF_MS);
}

/**
 * Check whether a sync queue entry should be skipped due to exponential backoff.
 */
function shouldSkipForBackoff(entry: SyncQueueEntry): boolean {
  if (entry.retries === 0) return false;
  const backoffMs = computeBackoffMs(entry);
  const queuedAt = new Date(entry.queuedAt).getTime();
  return Date.now() - queuedAt < backoffMs;
}

/**
 * Process the sync queue -- push pending writes to OneDrive.
 * Returns sync result with status and file count.
 *
 * Failed entries are retained in the queue with an incremented retry
 * counter and exponential backoff. After MAX_RETRIES (5), the entry is
 * permanently removed and the failure is reported.
 *
 * Conflict detection: before writing, the remote ETag is checked against
 * the locally cached ETag. If they differ (remote was modified by another
 * client), the conflict is reported rather than silently overwriting.
 */
export async function processSyncQueue(
  oneDrive: OneDriveClient,
): Promise<SyncResult> {
  if (!oneDrive.isAuthenticated()) {
    return { status: 'offline', filesWritten: 0, errors: [], permanentlyFailed: [], conflicts: [] };
  }

  const queue = await getSyncQueue();
  if (queue.length === 0) {
    return { status: 'synced', filesWritten: 0, errors: [], permanentlyFailed: [], conflicts: [] };
  }

  // Deduplicate: keep only the latest entry per path+operation
  const deduped = new Map<string, SyncQueueEntry>();
  for (const entry of queue) {
    const key = `${entry.operation}:${entry.path}`;
    const existing = deduped.get(key);
    if (!existing || new Date(entry.queuedAt) > new Date(existing.queuedAt)) {
      deduped.set(key, entry);
    }
  }

  // Remove stale duplicate entries from the queue
  const dedupedIds = new Set(Array.from(deduped.values()).map((e) => e.id));
  for (const entry of queue) {
    if (!dedupedIds.has(entry.id)) {
      await removeFromSyncQueue(entry.id);
    }
  }

  let filesWritten = 0;
  const errors: string[] = [];
  const permanentlyFailed: PermanentlyFailedEntry[] = [];
  const conflicts: ConflictEntry[] = [];

  for (const entry of deduped.values()) {
    // Skip entries that are still in their backoff window
    if (shouldSkipForBackoff(entry)) {
      continue;
    }

    try {
      if (entry.operation === 'write') {
        // Conflict detection: check ETag before writing
        const cached = await getCachedFile(entry.path);
        const localEtag = cached?.etag ?? '';

        if (localEtag) {
          const remoteEtag = await oneDrive.getEtag(entry.path);
          if (remoteEtag !== null && localEtag !== remoteEtag) {
            // Conflict detected: remote file was modified externally
            const remoteFile = await oneDrive.readFile(entry.path);
            conflicts.push({
              path: entry.path,
              localContent: entry.content,
              remoteContent: remoteFile?.content ?? '',
              localEtag,
              remoteEtag,
            });
            // Remove from queue -- conflict must be resolved by the user
            await removeFromSyncQueue(entry.id);
            continue;
          }
        }

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
        const permMessage = `Permanently failed to sync ${entry.path} after ${MAX_RETRIES} retries: ${String(err)}`;
        console.error(`[FinPlanner] ${permMessage}`);
        permanentlyFailed.push({ path: entry.path, lastError: String(err) });
      }
    }
  }

  const hasProblems = permanentlyFailed.length > 0 || errors.length > 0 || conflicts.length > 0;

  return {
    status: hasProblems ? 'error' : 'synced',
    filesWritten,
    errors,
    permanentlyFailed,
    conflicts,
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
