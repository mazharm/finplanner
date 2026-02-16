import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  'packages/*/vitest.config.ts',
  'packages/tax/*/vitest.config.ts',
  'tests/golden/vitest.config.ts',
]);
