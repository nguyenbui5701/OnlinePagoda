import { defineConfig } from 'vitest/config';

// Only project tests belong to the normal test suite.
// Files under stage* / patch* are installation backups, not runnable tests.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
