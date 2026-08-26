import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/query-keys';
import { AppError } from '@/lib/errors';
import {
  checkoutApi,
  type CheckoutRefreshPayload,
  type CheckoutSession,
  type CheckoutStartPayload,
} from '@/services/sdk';
import { useAuthStore } from '@/store/auth-store';
import { useCheckoutStore } from '@/store/checkout-store';

const CLOSED_CHECKOUT_STATUSES = new Set(['completed', 'cancelled', 'expired']);

function isClosedCheckoutSession(session: CheckoutSession): boolean {
  return CLOSED_CHECKOUT_STATUSES.has(session.status);
}

function isCheckoutClosedError(error: unknown): boolean {
  return AppError.isAppError(error) && error.code === 'CHECKOUT_CLOSED';
}

function clearStaleCheckout(queryClient: ReturnType<typeof useQueryClient>, ref?: string | null) {
  useCheckoutStore.getState().resetCheckoutUi();
  if (ref) {
    queryClient.removeQueries({ queryKey: QUERY_KEYS.checkout.detail(ref) });
  }
}

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
  const accessToken = useAuthStore((state) => state.accessToken);
  const ref = checkoutRef ?? storedToken;
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: QUERY_KEYS.checkout.detail(ref ?? 'none'),
    queryFn: async () => {
      const session = await checkoutApi.getById(ref!);
      if (isClosedCheckoutSession(session)) {
        clearStaleCheckout(queryClient, ref);
        // Signal that this token is unusable so the page can start a fresh session.
        throw new AppError(`Checkout is ${session.status} and can no longer be modified`, {
          code: 'CHECKOUT_CLOSED',
          status: 400,
          details: { status: session.status, checkoutToken: session.checkoutToken },
        });
      }
      syncCheckoutSession(session);
      return session;
    },
    // Never hit /checkout while logged out — stale tokens caused 401 spam + slow guest UX.
    enabled: Boolean(ref && accessToken),
    // Keep steps instant: trust cache for 2 minutes; mutations update the cache directly.
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    retry: false,
    placeholderData: (previous) =>
      previous && !isClosedCheckoutSession(previous) ? previous : undefined,
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
      if (ref) {
        // Never refresh a prior Buy Now session for full-bag checkout — that
        // filtered lines to one SKU and left the summary empty.
        try {
          await checkoutApi.cancel(ref);
        } catch {
          /* already closed */
        }
        useCheckoutStore.getState().setCheckoutToken(null);
        return checkoutApi.start(payload);
      }
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
    onError: (error, variables) => {
      if (isCheckoutClosedError(error)) {
        clearStaleCheckout(queryClient, variables.checkoutRef);
      }
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

export function useReleaseCheckoutMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (checkoutRef: string) => checkoutApi.release(checkoutRef),
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

export { isCheckoutClosedError, isClosedCheckoutSession };
