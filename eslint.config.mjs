import js from '@eslint/js';
import prettier from 'eslint-config-prettier';

/**
 * Root config. Each workspace owns its own `eslint.config.mjs` and is linted
 * with that workspace as the working directory, so this file deliberately
 * ignores all three and covers only what sits outside them: the release and
 * maintenance scripts, and root-level tooling.
 *
 * Without this, `eslint` run from the repository root fails outright — which is
 * exactly how the pre-commit hook invokes it.
 */
export default [
  {
    ignores: [
      'web/**',
      'server/**',
      'shared/**',
      'node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/coverage/**',
    ],
  },

  js.configs.recommended,
  prettier,

  {
    files: ['scripts/**/*.mjs', '*.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { process: 'readonly', console: 'readonly' },
    },
    rules: {
      /* These scripts are CLI tools whose entire output is console text, and
         they run in CI where a non-zero exit is the signal that matters. */
      'no-console': 'off',
      eqeqeq: ['error', 'smart'],
      'prefer-const': 'error',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
];
