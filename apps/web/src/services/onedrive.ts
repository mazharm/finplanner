/**
 * OneDrive service for FinPlanner.
 *
 * Uses MSAL.js for authentication (PKCE flow for SPA)
 * and Microsoft Graph API for file operations.
 *
 * This module provides the interface and a stub implementation.
 * The actual MSAL + Graph integration requires an Azure AD app registration.
 */

export interface OneDriveConfig {
  clientId: string;
  authority: string;
  redirectUri: string;
  scopes: string[];
}

export interface OneDriveFileInfo {
  path: string;
  content: string;
  etag: string;
  lastModified: string;
}

export interface OneDriveClient {
  /** Initiate MSAL login (popup or redirect) */
  login(): Promise<boolean>;

  /** Check if user is authenticated */
  isAuthenticated(): boolean;

  /** Logout */
  logout(): Promise<void>;

  /** Read a file from OneDrive */
  readFile(path: string): Promise<OneDriveFileInfo | null>;

  /** Write a file to OneDrive (creates if not exists) */
  writeFile(path: string, content: string): Promise<OneDriveFileInfo>;

  /** Delete a file from OneDrive */
  deleteFile(path: string): Promise<void>;

  /** List files in a directory */
  listFiles(folderPath: string): Promise<string[]>;

  /** Create a folder */
  createFolder(path: string): Promise<void>;

  /** Get the ETag for a file (for conflict detection) */
  getEtag(path: string): Promise<string | null>;
}

/**
 * Stub OneDrive client for development.
 * In production, this would be replaced with a real MSAL.js + Graph SDK implementation.
 */
export function createStubOneDriveClient(): OneDriveClient {
  let authenticated = false;

  return {
    async login() {
      // In production: MSAL.js acquireTokenPopup() or acquireTokenRedirect()
      authenticated = true;
      return true;
    },

    isAuthenticated() {
      return authenticated;
    },

    async logout() {
      authenticated = false;
    },

    async readFile(_path: string) {
      // In production: graph.api(`/me/drive/root:/${FINPLANNER_ROOT}/${path}:/content`).get()
      return null;
    },

    async writeFile(path: string, content: string) {
      // In production: graph.api(`/me/drive/root:/${FINPLANNER_ROOT}/${path}:/content`).put(content)
      return {
        path,
        content,
        etag: `stub-${Date.now()}`,
        lastModified: new Date().toISOString(),
      };
    },

    async deleteFile(_path: string) {
      // In production: graph.api(`/me/drive/root:/${FINPLANNER_ROOT}/${path}`).delete()
    },

    async listFiles(_folderPath: string) {
      // In production: graph.api(`/me/drive/root:/${FINPLANNER_ROOT}/${folderPath}:/children`).get()
      return [];
    },

    async createFolder(_path: string) {
      // In production: graph.api(`/me/drive/root:/${FINPLANNER_ROOT}/${path}`).create folder
    },

    async getEtag(_path: string) {
      return null;
    },
  };
}

/** The root folder name in OneDrive */
export const FINPLANNER_ROOT = 'FinPlanner';

/**
 * Validate that a file path is safe and stays within the FinPlanner root.
 * Rejects path traversal attempts, absolute paths, and other unsafe patterns.
 */
export function validateOneDrivePath(path: string): void {
  if (!path || path.trim().length === 0) {
    throw new Error('OneDrive path must not be empty');
  }
  if (path.startsWith('/') || path.startsWith('\\')) {
    throw new Error('OneDrive path must be relative, not absolute');
  }
  // Reject path traversal segments
  const segments = path.split(/[/\\]/);
  for (const segment of segments) {
    if (segment === '..' || segment === '.') {
      throw new Error('OneDrive path must not contain ".." or "." segments');
    }
  }
  // Ensure the path starts with the FinPlanner root
  if (!path.startsWith(FINPLANNER_ROOT + '/') && path !== FINPLANNER_ROOT) {
    throw new Error(`OneDrive path must be within the "${FINPLANNER_ROOT}/" root`);
  }
}

/** Standard folder structure paths */
export const FOLDER_STRUCTURE = {
  root: FINPLANNER_ROOT,
  agent: `${FINPLANNER_ROOT}/.agent`,
  agentSchemas: `${FINPLANNER_ROOT}/.agent/schemas`,
  shared: `${FINPLANNER_ROOT}/shared`,
  tax: `${FINPLANNER_ROOT}/tax`,
  retirement: `${FINPLANNER_ROOT}/retirement`,
  retirementResults: `${FINPLANNER_ROOT}/retirement/results`,
  imports: `${FINPLANNER_ROOT}/imports`,
  config: `${FINPLANNER_ROOT}/config.ndjson`,
} as const;
