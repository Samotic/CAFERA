import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,

  {
    rules: {
      /* The spec forbids `any` in committed code, so it is an error, not a warning. */
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'smart'],
      'prefer-const': 'error',

      /**
       * `process.env` is read in exactly one place: src/lib/env.ts.
       *
       * An unset variable is an empty string, which is not nullish, so `??`
       * passes it through as a real value. That produced a rewrite destination
       * pointing at itself and a silent 404 on every API call. Reading through
       * the validated `env` object means an empty variable fails at load with
       * its own name instead of travelling into a URL or a signing key.
       */
      'no-restricted-properties': [
        'error',
        {
          object: 'process',
          property: 'env',
          message:
            'Import { env } from "@/lib/env" instead. Direct process.env access lets an empty-string variable pass as a real value.',
        },
      ],

      'no-restricted-syntax': [
        'error',
        {
          /**
           * Tokens in web storage are an account-takeover primitive: any XSS can
           * read them. The access token lives in memory and the refresh token in
           * an httpOnly cookie, so nothing auth-shaped ever belongs here.
           */
          selector:
            'CallExpression[callee.object.name=/^(localStorage|sessionStorage)$/][callee.property.name=/^(setItem|getItem)$/] > Literal[value=/[Tt]oken|[Aa]uth|[Pp]assword|[Ss]ecret|[Cc]redential/]',
          message:
            'Never persist tokens or credentials in web storage — the access token is memory-only and the refresh token is an httpOnly cookie.',
        },
      ],
    },
  },

  {
    /* Storage access is centralised in one audited module, which needs the raw API. */
    files: ['src/lib/storage.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },

  {
    /* The env module is the one place process.env may be read, and the build
       config runs before the module graph exists. */
    files: ['src/lib/env.ts', 'next.config.ts', 'playwright.config.ts', 'vitest.config.mts'],
    rules: { 'no-restricted-properties': 'off' },
  },

  {
    files: ['**/*.test.ts', '**/*.test.tsx', 'e2e/**/*.ts', 'vitest.setup.ts'],
    rules: { 'no-console': 'off', 'no-restricted-properties': 'off' },
  },

  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'coverage/**',
    'playwright-report/**',
    'test-results/**',
  ]),
]);

export default eslintConfig;
