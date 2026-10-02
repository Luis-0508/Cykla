import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  oxc: { jsx: { runtime: 'automatic' } },
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json-summary'],
      include: ['src/domain/**/*.ts', 'src/database/**/*.ts', 'src/services/**/*.ts'],
      exclude: ['**/*.test.ts', '**/testing/**', '**/models.ts'],
    },
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
