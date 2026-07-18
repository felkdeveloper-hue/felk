import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ReactNode } from 'react';
import { STORAGE_KEYS } from '@/constants/storage-keys';

interface ThemeProviderProps {
  children: ReactNode;
}

/**
 * Wraps `next-themes` for light/dark only (no system).
 * Dark is the default storefront theme.
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
      storageKey={STORAGE_KEYS.theme}
    >
      {children}
    </NextThemesProvider>
  );
}
