import { defineConfig } from 'vitest/config';

// Separate config so `pnpm test` (unit tests) stays independent of a built dist/.
// The dist smoke suite runs only via `pnpm test:dist`, after `pnpm build`.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
