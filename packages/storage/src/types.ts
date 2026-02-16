export interface ImportLineError {
  line: number;
  message: string;
  raw?: string;
}

export interface ImportValidationResult {
  valid: boolean;
  errors: ImportLineError[];
  recordCounts: Record<string, number>;
  schemaVersion?: string;
}

export interface OneDriveFile {
  name: string;
  content: string;
}
