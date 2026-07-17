import { reactConfig } from '@fe-platform/eslint-config/react';

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...reactConfig,
  {
    files: [
      'src/components/ui/**/*.{ts,tsx}',
      'src/components/forms/form-field.tsx',
      'src/components/media/carousel.tsx',
    ],
    rules: {
      // Design-system modules co-export variants, hooks, and components.
      'react-refresh/only-export-components': 'off',
    },
  },
];
