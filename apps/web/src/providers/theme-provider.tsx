import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ReactNode } from 'react';
import { STORAGE_KEYS } from '@/constants/storage-keys';

interface ThemeProviderProps {
  children: ReactNode;
}

/**
 * Wraps `next-themes`, which owns `light` / `dark` / `system` resolution
 * and syncs the `class` attribute on `<html>` to avoid flash-of-wrong-theme.
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey={STORAGE_KEYS.theme}
    >
      {children}
    </NextThemesProvider>
  );
}
