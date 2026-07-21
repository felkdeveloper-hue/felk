import { useMutation, useQuery } from '@tanstack/react-query';
import { buildAbsoluteUrl } from '@/config/site';
import { ROUTES } from '@/constants';
import { QUERY_KEYS } from '@/constants/query-keys';
import {
  paymentsApi,
  type PaymentCreatePayload,
  type PaymentMethod,
  type PaymentRetryPayload,
  type PaymentStatus,
} from '@/services/sdk';
import { useCheckoutStore } from '@/store/checkout-store';

const TERMINAL_STATUSES: PaymentStatus[] = ['paid', 'failed', 'cancelled', 'expired', 'refunded'];

export function usePaymentStatusQuery(checkoutToken?: string | null, options?: { poll?: boolean }) {
  return useQuery({
    queryKey: QUERY_KEYS.payments.status(checkoutToken ?? 'none'),
    queryFn: () => paymentsApi.getStatusByCheckoutToken(checkoutToken!),
    enabled: Boolean(checkoutToken),
    refetchInterval: (query) => {
      if (!options?.poll) return false;
      const data = query.state.data;
      if (!data) return 2000;
      // COD is confirmed once an order exists (fulfilled at placement or on status probe).
      if (data.method === 'cod') return data.orderNumber ? false : 2000;
      if (TERMINAL_STATUSES.includes(data.status)) return false;
      if (data.status === 'paid' || data.status === 'authorized') return false;
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
  return {
    returnUrl: buildAbsoluteUrl(successPath),
    cancelUrl: buildAbsoluteUrl(cancelPath),
  };
}

export function usePlaceOrderMutation() {
  const createPayment = useCreatePaymentMutation();
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
      return createPayment.mutateAsync({
        checkoutToken,
        method,
        ...urls,
      });
    },
    onMutate: ({ method }) => {
      // Only gateways need the redirect overlay; COD navigates straight to success.
      if (method !== 'cod') setRedirecting(true);
    },
    onSettled: () => setRedirecting(false),
  });
}
