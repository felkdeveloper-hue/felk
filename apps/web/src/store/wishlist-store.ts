import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { zustandStorage } from '@/lib/storage';
import type { EnrichedWishlistItem } from '@/utils/wishlist';

export type GuestWishlistItem = EnrichedWishlistItem;

interface WishlistState {
  items: GuestWishlistItem[];
}

interface WishlistActions {
  addItem: (item: Omit<GuestWishlistItem, 'id'> & { id?: string }) => GuestWishlistItem;
  removeItem: (opts: { itemId?: string; productId?: string; variantId?: string }) => void;
  clear: () => void;
  hasItem: (productId: string, variantId?: string) => boolean;
}

export type WishlistStore = WishlistState & WishlistActions;

function guestItemId(productId: string, variantId?: string) {
  return `guest-${productId}-${variantId ?? 'any'}`;
}

function sameItem(
  item: GuestWishlistItem,
  opts: { itemId?: string; productId?: string; variantId?: string },
) {
  if (opts.itemId && item.id === opts.itemId) return true;
  if (
    opts.productId &&
    item.productId === opts.productId &&
    (opts.variantId ? item.variantId === opts.variantId : true)
  ) {
    return true;
  }
  return false;
}

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (input) => {
        const productId = input.productId;
        const variantId = input.variantId;
        const existing = get().items.find(
          (item) =>
            item.productId === productId && (variantId ? item.variantId === variantId : true),
        );
        if (existing) return existing;

        const next: GuestWishlistItem = {
          id: input.id ?? guestItemId(productId, variantId),
          productId,
          variantId,
          productName: input.productName,
          productSlug: input.productSlug,
          thumbnailUrl: input.thumbnailUrl,
          price: input.price,
          salePrice: input.salePrice,
          variantTitle: input.variantTitle,
          variantSku: input.variantSku,
          productStatus: input.productStatus,
          addedAt: input.addedAt ?? new Date().toISOString(),
        };
        set((state) => ({ items: [next, ...state.items] }));
        return next;
      },

      removeItem: (opts) => {
        set((state) => ({
          items: state.items.filter((item) => !sameItem(item, opts)),
        }));
      },

      clear: () => set({ items: [] }),

      hasItem: (productId, variantId) =>
        get().items.some(
          (item) =>
            item.productId === productId && (variantId ? item.variantId === variantId : true),
        ),
    }),
    {
      name: STORAGE_KEYS.wishlist,
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({ items: state.items }),
    },
  ),
);

export function selectWishlistItemCount(state: WishlistStore): number {
  return state.items.length;
}

export function toGuestWishlistView(items: GuestWishlistItem[]) {
  return {
    id: 'guest',
    name: 'Wishlist',
    isDefault: true,
    itemCount: items.length,
    items,
  };
}
