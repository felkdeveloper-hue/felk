import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { zustandStorage } from '@/lib/storage';
import type { ThemeMode } from '@/types';

/**
 * Thin store kept alongside `next-themes` (which owns the actual DOM
 * class/attribute + localStorage sync for `light`/`dark`).
 * This store only tracks extra, app-specific display preferences that
 * `next-themes` doesn't manage.
 */
interface ThemeState {
  lastKnownMode: ThemeMode;
  reducedMotion: boolean;
}

interface ThemeActions {
  setLastKnownMode: (mode: ThemeMode) => void;
  setReducedMotion: (reducedMotion: boolean) => void;
}

export type ThemeStore = ThemeState & ThemeActions;

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      lastKnownMode: 'dark',
      reducedMotion: false,

      setLastKnownMode: (mode) => set({ lastKnownMode: mode }),
      setReducedMotion: (reducedMotion) => set({ reducedMotion }),
    }),
    {
      name: STORAGE_KEYS.theme,
      storage: createJSONStorage(() => zustandStorage),
    },
  ),
);
