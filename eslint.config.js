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
      // Load/k6 scripts are Node/k6 globals — not part of the app lint surface.
      'apps/api/src/test/load/**',
    ],
  },
];
