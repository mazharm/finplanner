import { z } from 'zod';
import { ndjsonRecordTypeSchema } from './common.js';

export const ndjsonHeaderSchema = z.object({
  _type: z.literal('header'),
  schemaVersion: z.string().regex(/^\d+\.\d+\.\d+/, 'Must be valid semver'),
  savedAt: z.string().datetime({ offset: true }),
  modules: z.array(z.enum(['tax', 'retirement', 'config'])),
  checksum: z.string().optional(),
});

export const ndjsonRecordSchema = z.object({
  _type: ndjsonRecordTypeSchema,
}).passthrough();
