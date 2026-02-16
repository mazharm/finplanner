import { z } from 'zod';
import { ndjsonRecordTypeSchema } from './common.js';

export const ndjsonHeaderSchema = z.object({
  _type: z.literal('header'),
  schemaVersion: z.string(),
  savedAt: z.string(),
  modules: z.array(z.enum(['tax', 'retirement', 'config'])),
  checksum: z.string().optional(),
});

export const ndjsonRecordSchema = z.object({
  _type: ndjsonRecordTypeSchema,
}).passthrough();
