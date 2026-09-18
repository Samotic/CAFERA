import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'coverage/**'] },

  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,

  {
    languageOptions: {
      parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
      globals: { process: 'readonly', console: 'readonly', setTimeout: 'readonly' },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      /* The structured logger redacts credentials; console.log does not, and a
         password printed to stdout ends up in the platform's log retention. */
      'no-console': ['error', { allow: ['error'] }],
      eqeqeq: ['error', 'smart'],
      'prefer-const': 'error',
      'no-restricted-properties': [
        'error',
        {
          object: 'process',
          property: 'env',
          message:
            'Import the validated `env` object from config/env.ts instead of reading process.env directly.',
        },
      ],
    },
  },

  {
    /* These three are the only places allowed to touch process.env: the module
       that validates it, the bootstrap, and the test harness. */
    files: ['src/config/env.ts', 'src/server.ts', 'tests/**/*.ts', 'vitest.config.ts'],
    rules: { 'no-restricted-properties': 'off', 'no-console': 'off' },
  },
);
