import { useMutation, useQuery } from '@tanstack/react-query';
import { buildAbsoluteUrl } from '@/config/site';
import { ROUTES } from '@/constants';
import { QUERY_KEYS } from '@/constants/query-keys';
import { AppError } from '@/lib/errors';
import {
  checkoutApi,
  paymentsApi,
  type PaymentCreatePayload,
  type PaymentMethod,
  type PaymentRetryPayload,
} from '@/services/sdk';
import { useCheckoutStore } from '@/store/checkout-store';

export function usePaymentStatusQuery(checkoutToken?: string | null, options?: { poll?: boolean }) {
  return useQuery({
    queryKey: QUERY_KEYS.payments.status(checkoutToken ?? 'none'),
    queryFn: () => paymentsApi.getStatusByCheckoutToken(checkoutToken!),
    enabled: Boolean(checkoutToken),
    refetchInterval: (query) => {
      if (!options?.poll) return false;
      const data = query.state.data;
      if (!data) return 2000;
      if (query.state.dataUpdateCount > 45) return false;
      if (data.orderNumber) return false;
      if (data.status === 'failed' || data.status === 'cancelled' || data.status === 'expired') {
        return false;
      }
      return 2000;
    },
  });
}

export function useCreatePaymentMutation() {
  return useMutation({
    mutationFn: (payload: PaymentCreatePayload) => paymentsApi.create(payload),
  });
}

export function useRetryPaymentMutation() {
  return useMutation({
    mutationFn: (payload: PaymentRetryPayload) => paymentsApi.retry(payload),
  });
}

export function buildPaymentReturnUrls(checkoutToken: string) {
  const successPath = `${ROUTES.checkoutSuccess}?checkoutToken=${encodeURIComponent(checkoutToken)}`;
  const cancelPath = `${ROUTES.checkoutCancel}?checkoutToken=${encodeURIComponent(checkoutToken)}`;

  // Gateways (Mintpay/PayHere) reject localhost callback URLs. When developing
  // locally, send shoppers back to the live storefront cancel/success pages.
  const configured = (import.meta.env.VITE_PAYMENT_RETURN_ORIGIN as string | undefined)?.trim();
  let origin = configured?.replace(/\/$/, '') || '';
  if (!origin && typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local')) {
      origin = 'https://fe.lk';
    }
  }
  if (!origin) {
    return {
      returnUrl: buildAbsoluteUrl(successPath),
      cancelUrl: buildAbsoluteUrl(cancelPath),
    };
  }
  return {
    returnUrl: `${origin}${successPath.startsWith('/') ? successPath : `/${successPath}`}`,
    cancelUrl: `${origin}${cancelPath.startsWith('/') ? cancelPath : `/${cancelPath}`}`,
  };
}

export function usePlaceOrderMutation() {
  const setRedirecting = useCheckoutStore((state) => state.setRedirectingToGateway);

  return useMutation({
    mutationFn: async ({
      checkoutToken,
      method,
    }: {
      checkoutToken: string;
      method: PaymentMethod;
    }) => {
      const urls = buildPaymentReturnUrls(checkoutToken);
      try {
        return await paymentsApi.create({
          checkoutToken,
          method,
          ...urls,
        });
      } catch (error) {
        // Older API builds throw this when a prior Mintpay/PayHere attempt failed.
        // Seamless retry so shoppers are not stuck on "use /payments/retry".
        if (AppError.isAppError(error) && error.code === 'PAYMENT_RETRY_REQUIRED') {
          return paymentsApi.retry({ checkoutToken, method });
        }
        // Stale checkout token (cancelled by a duplicate /checkout/start) — restart once.
        if (AppError.isAppError(error) && error.code === 'CHECKOUT_NOT_READY') {
          const restarted = await checkoutApi.start({ autoReserve: false });
          useCheckoutStore.getState().setCheckoutToken(restarted.checkoutToken);
          const healedUrls = buildPaymentReturnUrls(restarted.checkoutToken);
          return paymentsApi.create({
            checkoutToken: restarted.checkoutToken,
            method,
            ...healedUrls,
          });
        }
        throw error;
      }
    },
    onMutate: ({ method }) => {
      // Only gateways need the redirect overlay; COD navigates straight to success.
      if (method !== 'cod') setRedirecting(true);
    },
    onSettled: () => setRedirecting(false),
  });
}
