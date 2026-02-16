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
      '@finplanner/tax-computation': path.resolve(__dirname, '../../packages/tax/computation/src'),
      '@finplanner/tax-extraction': path.resolve(__dirname, '../../packages/tax/extraction/src'),
      '@finplanner/tax-checklist': path.resolve(__dirname, '../../packages/tax/checklist/src'),
      '@finplanner/tax-anomaly': path.resolve(__dirname, '../../packages/tax/anomaly/src'),
      '@finplanner/storage': path.resolve(__dirname, '../../packages/storage/src'),
    },
  },
});
