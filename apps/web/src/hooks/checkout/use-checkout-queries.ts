import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/query-keys';
import { AppError } from '@/lib/errors';
import {
  checkoutApi,
  type CheckoutRefreshPayload,
  type CheckoutSession,
  type CheckoutStartPayload,
} from '@/services/sdk';
import { useCheckoutStore } from '@/store/checkout-store';

function syncCheckoutSession(session: CheckoutSession) {
  const store = useCheckoutStore.getState();
  store.setCheckoutToken(session.checkoutToken);
  if (session.shippingMethod) {
    store.setSelectedShippingMethod(session.shippingMethod);
  }
  if (session.shippingAddress?.addressId) {
    store.setSelectedShippingAddressId(session.shippingAddress.addressId);
  }
  if (session.billingAddress?.addressId) {
    store.setSelectedBillingAddressId(session.billingAddress.addressId);
  }
}

function cacheCheckoutSession(
  queryClient: ReturnType<typeof useQueryClient>,
  session: CheckoutSession,
) {
  queryClient.setQueryData(QUERY_KEYS.checkout.detail(session.checkoutToken), session);
  queryClient.setQueryData(QUERY_KEYS.checkout.detail(session.id), session);
}

export function useCheckoutSessionQuery(checkoutRef?: string | null) {
  const storedToken = useCheckoutStore((state) => state.checkoutToken);
  const ref = checkoutRef ?? storedToken;

  return useQuery({
    queryKey: QUERY_KEYS.checkout.detail(ref ?? 'none'),
    queryFn: async () => {
      const session = await checkoutApi.getById(ref!);
      syncCheckoutSession(session);
      return session;
    },
    enabled: Boolean(ref),
    staleTime: 1000 * 15,
  });
}

async function startOrResumeCheckout(payload: CheckoutStartPayload): Promise<CheckoutSession> {
  try {
    return await checkoutApi.start(payload);
  } catch (error) {
    if (
      AppError.isAppError(error) &&
      error.code === 'DUPLICATE_CHECKOUT' &&
      error.details &&
      typeof error.details === 'object'
    ) {
      const details = error.details as { checkoutId?: string; checkoutToken?: string };
      const ref = details.checkoutToken ?? details.checkoutId;
      if (ref) return checkoutApi.getById(ref);
    }
    throw error;
  }
}

export function useStartCheckoutMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: startOrResumeCheckout,
    onSuccess: (session) => {
      syncCheckoutSession(session);
      cacheCheckoutSession(queryClient, session);
    },
  });
}

export function useRefreshCheckoutMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      checkoutRef,
      payload,
    }: {
      checkoutRef: string;
      payload: CheckoutRefreshPayload;
    }) => checkoutApi.refresh(checkoutRef, payload),
    onSuccess: (session) => {
      syncCheckoutSession(session);
      cacheCheckoutSession(queryClient, session);
    },
  });
}

export function useValidateCheckoutMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (checkoutRef: string) => checkoutApi.validate(checkoutRef),
    onSuccess: (session) => {
      syncCheckoutSession(session);
      cacheCheckoutSession(queryClient, session);
    },
  });
}

export function useReserveCheckoutMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (checkoutRef: string) => checkoutApi.reserve(checkoutRef),
    onSuccess: (session) => {
      syncCheckoutSession(session);
      cacheCheckoutSession(queryClient, session);
    },
  });
}

export function useCancelCheckoutMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (checkoutRef: string) => checkoutApi.cancel(checkoutRef),
    onSuccess: (_result, checkoutRef) => {
      useCheckoutStore.getState().resetCheckoutUi();
      queryClient.removeQueries({ queryKey: QUERY_KEYS.checkout.detail(checkoutRef) });
    },
  });
}
