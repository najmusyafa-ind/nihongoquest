// F-5 fix: Renamed from vitest.config.ts → vitest.config.mts
// Forces ESM treatment, eliminating the "ESM syntax in a file loaded as CommonJS"
// warning that would become a breaking error on the next Vite major.
// Uses import.meta.dirname (ESM native) instead of __dirname (CJS only).
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    // Windows-safe: forks pool fails on paths with spaces (e.g. "JAPANESE PROJECT")
    // vmThreads runs tests in worker_threads (not child_process), avoiding the issue.
    pool: 'vmThreads',
    testTimeout: 30_000,
  },
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, './src'),
    },
  },
});
