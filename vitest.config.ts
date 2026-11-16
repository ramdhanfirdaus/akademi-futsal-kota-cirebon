import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname),
      'server-only': path.resolve(__dirname, 'tests/helpers/empty.ts'),
    },
  },
  test: {
    environment: 'node',
    // Each test file spins up in-memory Postgres (PGlite); too many at once exhausts memory.
    maxWorkers: 2,
    testTimeout: 20000,
    hookTimeout: 30000,
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
  },
});
