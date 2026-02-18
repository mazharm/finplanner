/**
 * Abstraction layer for reading FinPlanner data folders.
 * Supports both local filesystem (File System Access API) and OneDrive sources.
 */

import type { OneDriveClient } from './onedrive.js';

export interface FolderReader {
  /** List entry names in a folder (files and subdirectories). */
  listEntries(folderPath: string): Promise<string[]>;
  /** Read a file's text content. Returns null if the file does not exist. */
  readFile(filePath: string): Promise<string | null>;
  /** Check whether a path is a directory. */
  isDirectory(path: string): Promise<boolean>;
}

/**
 * LocalFolderReader wraps a FileSystemDirectoryHandle from the
 * File System Access API (Chromium-based browsers).
 */
export class LocalFolderReader implements FolderReader {
  constructor(private root: FileSystemDirectoryHandle) {}

  private async navigateTo(path: string): Promise<FileSystemDirectoryHandle | FileSystemFileHandle | null> {
    const segments = path.split('/').filter(Boolean);
    if (segments.length === 0) return this.root;

    let current: FileSystemDirectoryHandle = this.root;
    for (let i = 0; i < segments.length - 1; i++) {
      try {
        current = await current.getDirectoryHandle(segments[i]);
      } catch {
        return null;
      }
    }

    const last = segments[segments.length - 1];
    // Try as directory first, then file
    try {
      return await current.getDirectoryHandle(last);
    } catch {
      try {
        return await current.getFileHandle(last);
      } catch {
        return null;
      }
    }
  }

  async listEntries(folderPath: string): Promise<string[]> {
    const handle = folderPath ? await this.navigateTo(folderPath) : this.root;
    if (!handle || handle.kind !== 'directory') return [];

    const names: string[] = [];
    for await (const entry of (handle as FileSystemDirectoryHandle).values()) {
      names.push(entry.name);
    }
    return names;
  }

  async readFile(filePath: string): Promise<string | null> {
    const handle = await this.navigateTo(filePath);
    if (!handle || handle.kind !== 'file') return null;

    try {
      const file = await (handle as FileSystemFileHandle).getFile();
      return await file.text();
    } catch {
      return null;
    }
  }

  async isDirectory(path: string): Promise<boolean> {
    if (!path) return true; // root is always a directory
    const handle = await this.navigateTo(path);
    return handle !== null && handle.kind === 'directory';
  }
}

/**
 * OneDriveFolderReader wraps an OneDriveClient for reading folder contents.
 */
export class OneDriveFolderReader implements FolderReader {
  constructor(private client: OneDriveClient, private rootPrefix: string) {}

  private resolvePath(path: string): string {
    return path ? `${this.rootPrefix}/${path}` : this.rootPrefix;
  }

  async listEntries(folderPath: string): Promise<string[]> {
    return this.client.listFiles(this.resolvePath(folderPath));
  }

  async readFile(filePath: string): Promise<string | null> {
    const info = await this.client.readFile(this.resolvePath(filePath));
    return info?.content ?? null;
  }

  async isDirectory(path: string): Promise<boolean> {
    // OneDrive: try listing — if it returns entries, it's a directory
    try {
      const entries = await this.client.listFiles(this.resolvePath(path));
      return entries.length >= 0; // listFiles succeeds → directory exists
    } catch {
      return false;
    }
  }
}
