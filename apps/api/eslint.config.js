import { nodeConfig } from '@fe-platform/eslint-config/node';

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    ignores: [
      'dist/**',
      'logs/**',
      'uploads/**',
      'coverage/**',
      'scripts/**',
      // Seed/ops scripts and load tools are not part of the runtime lint gate.
      'src/scripts/**',
      'src/test/load/**',
    ],
  },
  ...nodeConfig,
];
