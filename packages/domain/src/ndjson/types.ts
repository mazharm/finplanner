import type { NdjsonRecordType } from '../types/common.js';

export type { NdjsonRecordType } from '../types/common.js';

export interface NdjsonHeader {
  _type: 'header';
  schemaVersion: string;
  savedAt: string;
  modules: ('tax' | 'retirement' | 'config')[];
  checksum?: string;
}

export interface NdjsonRecord {
  _type: NdjsonRecordType;
  [key: string]: unknown;
}
