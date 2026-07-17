import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    setupFiles: ['./src/test/setup-env.ts'],
    globalSetup: ['./src/test/global-setup.ts'],
    fileParallelism: false,
    pool: 'forks',
    testTimeout: 90_000,
    hookTimeout: 120_000,
    sequence: { concurrent: false },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
