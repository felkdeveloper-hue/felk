import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { STORAGE_KEYS } from '@/constants/storage-keys';

interface UiState {
  sidebarCollapsed: boolean;
  theme: 'light' | 'dark' | 'system';
}

interface UiActions {
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setTheme: (theme: UiState['theme']) => void;
}

export const useUiStore = create<UiState & UiActions>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      theme: 'light',
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      setTheme: (theme) => set({ theme }),
    }),
    { name: STORAGE_KEYS.ui },
  ),
);
