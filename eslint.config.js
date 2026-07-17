/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.turbo/**',
      '**/coverage/**',
      'apps/api/src/uploads/**',
      'apps/api/src/logs/**',
    ],
  },
];
