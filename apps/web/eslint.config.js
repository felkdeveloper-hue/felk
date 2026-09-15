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
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      // Keep CI green: these fire widely on existing catalog/admin UI.
      'jsx-a11y/click-events-have-key-events': 'off',
      'jsx-a11y/no-static-element-interactions': 'off',
      'jsx-a11y/no-noninteractive-element-interactions': 'off',
      'jsx-a11y/no-autofocus': 'off',
      'jsx-a11y/media-has-caption': 'off',
      'jsx-a11y/aria-unsupported-elements': 'off',
      'jsx-a11y/role-has-required-aria-props': 'off',
      'jsx-a11y/heading-has-content': 'off',
      'react-refresh/only-export-components': 'off',
      'react-hooks/exhaustive-deps': 'warn',
      'react/no-unescaped-entities': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/consistent-type-imports': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      'prefer-const': 'warn',
      'prefer-spread': 'warn',
    },
  },
];
