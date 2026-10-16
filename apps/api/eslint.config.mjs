import js from '@eslint/js';
import sharedConfig from '@ludora/eslint-config';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores([
    'dist/**',
    'coverage/**',
    'src/generated/**',
    '**/*.tsbuildinfo',
  ]),
  js.configs.recommended,
  {
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ['**/*.{ts,mts,cts}'],
    extends: [tseslint.configs.recommended],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
    },
  },
  {
    files: ['**/*.{spec,test}.ts', 'test/**/*.ts'],
    languageOptions: {
      globals: globals.vitest,
    },
  },
  ...sharedConfig,
]);
