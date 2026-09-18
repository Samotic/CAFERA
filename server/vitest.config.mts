import { defineConfig } from 'vitest/config';

export default defineConfig({
  /* Point Vite's dotenv loader at a directory with no .env file. Tests must not
     inherit a developer's local credentials — a suite that passes only on the
     machine that has the right .env is not a test, it is a coincidence. */
  envDir: './tests',

  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
    setupFiles: ['./tests/setup.ts'],
    /* mongodb-memory-server downloads and boots a real mongod on first run, which
       is slow once and fast afterwards. The default 5s timeout is not enough for
       that first boot. */
    testTimeout: 30_000,
    hookTimeout: 60_000,
    /* Each file gets its own in-memory database, so tests cannot leak state into
       each other — but they must not share a single mongod either. */
    pool: 'forks',
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/seed/**', 'src/server.ts', 'src/types/**'],
    },
  },
});
