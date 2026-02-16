import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
  resolve: {
    alias: {
      '@finplanner/domain': path.resolve(__dirname, '../../packages/domain/src'),
      '@finplanner/validation': path.resolve(__dirname, '../../packages/validation/src'),
      '@finplanner/engine': path.resolve(__dirname, '../../packages/engine/src'),
      '@finplanner/scenarios': path.resolve(__dirname, '../../packages/scenarios/src'),
    },
  },
});
