import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { zustandStorage } from '@/lib/storage';
import type { CartView } from '@/services/sdk';

interface CartState {
  cart: CartView | null;
  guestCartToken: string | null;
  isSyncing: boolean;
  /** Bumped on every cart mutation so stale GET responses cannot overwrite optimistic state. */
  cartRevision: number;
}

interface CartActions {
  setCart: (cart: CartView | null) => void;
  setGuestCartToken: (token: string | null) => void;
  setSyncing: (isSyncing: boolean) => void;
  bumpCartRevision: () => number;
  clearCart: () => void;
}

export type CartStore = CartState & CartActions;

export const useCartStore = create<CartStore>()(
  persist(
    (set) => ({
      cart: null,
      guestCartToken: null,
      isSyncing: false,
      cartRevision: 0,

      setCart: (cart) =>
        set((state) => ({
          cart,
          // Never wipe a pending guest token when an authenticated cart refresh
          // returns guestCartToken: null — merge still needs that token.
          guestCartToken: cart?.guestCartToken ? cart.guestCartToken : state.guestCartToken,
        })),

      setGuestCartToken: (token) => set({ guestCartToken: token }),

      setSyncing: (isSyncing) => set({ isSyncing }),

      bumpCartRevision: () => {
        let next = 0;
        set((state) => {
          next = state.cartRevision + 1;
          return { cartRevision: next };
        });
        return next;
      },

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
