import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { zustandStorage } from '@/lib/storage';
import type { PaymentMethod, ShippingMethod } from '@/services/sdk';

export type BuyNowItem = { variantId: string; quantity: number };

interface CheckoutState {
  checkoutToken: string | null;
  /** When set, checkout shows only these SKUs (Buy Now). Full bag checkout clears this. */
  buyNowItems: BuyNowItem[] | null;
  billingSameAsShipping: boolean;
  selectedShippingAddressId: string | null;
  selectedBillingAddressId: string | null;
  selectedShippingMethod: ShippingMethod;
  selectedPaymentMethod: PaymentMethod | null;
  isRedirectingToGateway: boolean;
}

interface CheckoutActions {
  setCheckoutToken: (token: string | null) => void;
  setBuyNowItems: (items: BuyNowItem[] | null) => void;
  setBillingSameAsShipping: (value: boolean) => void;
  setSelectedShippingAddressId: (id: string | null) => void;
  setSelectedBillingAddressId: (id: string | null) => void;
  setSelectedShippingMethod: (method: ShippingMethod) => void;
  setSelectedPaymentMethod: (method: PaymentMethod | null) => void;
  setRedirectingToGateway: (value: boolean) => void;
  resetCheckoutUi: () => void;
}

export type CheckoutStore = CheckoutState & CheckoutActions;

const initialState: CheckoutState = {
  checkoutToken: null,
  buyNowItems: null,
  billingSameAsShipping: true,
  selectedShippingAddressId: null,
  selectedBillingAddressId: null,
  selectedShippingMethod: 'standard',
  selectedPaymentMethod: null,
  isRedirectingToGateway: false,
};

export const useCheckoutStore = create<CheckoutStore>()(
  persist(
    (set) => ({
      ...initialState,

      setCheckoutToken: (checkoutToken) => set({ checkoutToken }),

      setBuyNowItems: (buyNowItems) => set({ buyNowItems }),

      setBillingSameAsShipping: (billingSameAsShipping) => set({ billingSameAsShipping }),

      setSelectedShippingAddressId: (selectedShippingAddressId) =>
        set({ selectedShippingAddressId }),

      setSelectedBillingAddressId: (selectedBillingAddressId) => set({ selectedBillingAddressId }),

      setSelectedShippingMethod: (selectedShippingMethod) => set({ selectedShippingMethod }),

      setSelectedPaymentMethod: (selectedPaymentMethod) => set({ selectedPaymentMethod }),

      setRedirectingToGateway: (isRedirectingToGateway) => set({ isRedirectingToGateway }),

      resetCheckoutUi: () => set({ ...initialState }),
    }),
    {
      name: STORAGE_KEYS.checkout,
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        checkoutToken: state.checkoutToken,
        buyNowItems: state.buyNowItems,
        billingSameAsShipping: state.billingSameAsShipping,
        selectedShippingAddressId: state.selectedShippingAddressId,
        selectedBillingAddressId: state.selectedBillingAddressId,
        selectedShippingMethod: state.selectedShippingMethod,
        selectedPaymentMethod: state.selectedPaymentMethod,
      }),
    },
  ),
);
