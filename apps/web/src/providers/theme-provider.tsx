import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ReactNode } from 'react';
import { STORAGE_KEYS } from '@/constants/storage-keys';

interface ThemeProviderProps {
  children: ReactNode;
}

/**
 * Storefront defaults to light. Dark mode is admin-only (AdminLayout toggles `.dark`).
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
      storageKey={STORAGE_KEYS.theme}
    >
      {children}
    </NextThemesProvider>
  );
}
