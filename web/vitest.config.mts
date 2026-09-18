import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    /* Resolves the `@/*` alias from tsconfig.json natively — no plugin needed,
       and no second place where the alias could drift from the compiler's. */
    tsconfigPaths: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    /* Playwright owns `e2e/`. Running those files here would start a browser
       inside jsdom, which fails in a way that takes a while to diagnose. */
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['node_modules/**', '.next/**', 'e2e/**'],
    css: false,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/app/**/layout.tsx', 'src/types/**'],
    },
  },
});
