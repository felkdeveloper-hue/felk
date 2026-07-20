import { create } from 'zustand';

export type ModalId = 'quick-view' | 'size-guide' | 'newsletter' | string;

interface UiState {
  isMobileNavOpen: boolean;
  isSearchOpen: boolean;
  activeModal: ModalId | null;
  isGlobalLoading: boolean;
  cartAnnouncement: string | null;
}

interface UiActions {
  setMobileNavOpen: (open: boolean) => void;
  toggleMobileNav: () => void;
  setSearchOpen: (open: boolean) => void;
  toggleSearch: () => void;
  openModal: (id: ModalId) => void;
  closeModal: () => void;
  setGlobalLoading: (loading: boolean) => void;
  setCartAnnouncement: (message: string | null) => void;
}

export type UiStore = UiState & UiActions;

export const useUiStore = create<UiStore>((set) => ({
  isMobileNavOpen: false,
  isSearchOpen: false,
  activeModal: null,
  isGlobalLoading: false,
  cartAnnouncement: null,

  setMobileNavOpen: (open) => set({ isMobileNavOpen: open }),
  toggleMobileNav: () => set((state) => ({ isMobileNavOpen: !state.isMobileNavOpen })),

  setSearchOpen: (open) => set({ isSearchOpen: open }),
  toggleSearch: () => set((state) => ({ isSearchOpen: !state.isSearchOpen })),

  openModal: (id) => set({ activeModal: id }),
  closeModal: () => set({ activeModal: null }),

  setGlobalLoading: (loading) => set({ isGlobalLoading: loading }),

  setCartAnnouncement: (message) => set({ cartAnnouncement: message }),
}));
