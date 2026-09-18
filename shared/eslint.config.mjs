import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

/**
 * `shared` is imported by a browser bundle and a Node process alike, so the
 * rules here are about keeping it environment-neutral as much as they are about
 * style. Nothing in this package may reach for `window`, `process` or a runtime
 * API that only one side has.
 */
export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'coverage/**'] },

  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,

  {
    languageOptions: {
      parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
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
      eqeqeq: ['error', 'smart'],
      'prefer-const': 'error',
      'no-console': 'error',
      'no-restricted-globals': [
        'error',
        {
          name: 'window',
          message: 'shared/ runs on the server too — keep it environment-neutral.',
        },
        {
          name: 'document',
          message: 'shared/ runs on the server too — keep it environment-neutral.',
        },
        { name: 'localStorage', message: 'Web storage belongs in web/src/lib/storage.ts.' },
      ],
      'no-restricted-properties': [
        'error',
        {
          object: 'process',
          property: 'env',
          message: 'shared/ must not read configuration — pass values in from the caller.',
        },
      ],
    },
  },

  {
    files: ['tests/**/*.ts'],
    languageOptions: { globals: { process: 'readonly' } },
  },
);
