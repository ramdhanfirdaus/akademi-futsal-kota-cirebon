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
    testTimeout: 20000,
    hookTimeout: 30000,
    include: ['tests/**/*.test.ts'],
  },
});
