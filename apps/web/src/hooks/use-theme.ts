import { useTheme } from 'next-themes';
import { useThemeStore } from '@/store/theme-store';
import type { ThemeMode } from '@/types';

/** Unified theme API — next-themes owns DOM class; Zustand mirrors last-known mode. */
export function useThemeMode() {
  const { theme, setTheme, resolvedTheme, systemTheme } = useTheme();
  const lastKnownMode = useThemeStore((s) => s.lastKnownMode);
  const setLastKnownMode = useThemeStore((s) => s.setLastKnownMode);

  const setMode = (mode: ThemeMode) => {
    setTheme(mode);
    setLastKnownMode(mode);
  };

  return {
    theme: (theme as ThemeMode | undefined) ?? lastKnownMode,
    resolvedTheme,
    systemTheme,
    setTheme: setMode,
    isDark: resolvedTheme === 'dark',
  };
}
