import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@finplanner/domain': path.resolve(__dirname, '../../packages/domain/src'),
      '@finplanner/validation': path.resolve(__dirname, '../../packages/validation/src'),
      '@finplanner/engine': path.resolve(__dirname, '../../packages/engine/src'),
      '@finplanner/scenarios': path.resolve(__dirname, '../../packages/scenarios/src'),
      '@finplanner/claude': path.resolve(__dirname, '../../packages/claude/src'),
      '@finplanner/tax-extraction': path.resolve(__dirname, '../../packages/tax/extraction/src'),
      '@finplanner/storage': path.resolve(__dirname, '../../packages/storage/src'),
      '@finplanner/ui': path.resolve(__dirname, '../../packages/ui/src'),
    },
  },
  server: {
    port: 3000,
  },
});
