import globals from 'globals';
import { baseConfig } from './base.js';

/** @type {import('eslint').Linter.Config[]} */
export const nodeConfig = [
  ...baseConfig,
  {
    files: ['**/*.{ts,js}'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-console': 'off',
    },
  },
];

export default nodeConfig;
