import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { zustandStorage } from '@/lib/storage';
import type { CartView } from '@/services/sdk';

interface CartState {
  cart: CartView | null;
  guestCartToken: string | null;
  isSyncing: boolean;
}

interface CartActions {
  setCart: (cart: CartView | null) => void;
  setGuestCartToken: (token: string | null) => void;
  setSyncing: (isSyncing: boolean) => void;
  clearCart: () => void;
}

export type CartStore = CartState & CartActions;

export const useCartStore = create<CartStore>()(
  persist(
    (set) => ({
      cart: null,
      guestCartToken: null,
      isSyncing: false,

      setCart: (cart) =>
        set({
          cart,
          guestCartToken: cart?.guestCartToken ?? null,
        }),

      setGuestCartToken: (token) => set({ guestCartToken: token }),

      setSyncing: (isSyncing) => set({ isSyncing }),

      clearCart: () => set({ cart: null, guestCartToken: null }),
    }),
    {
      name: STORAGE_KEYS.cart,
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({ cart: state.cart, guestCartToken: state.guestCartToken }),
    },
  ),
);

export function selectCartItemCount(state: CartStore): number {
  return state.cart?.items.reduce((total, item) => total + item.quantity, 0) ?? 0;
}
