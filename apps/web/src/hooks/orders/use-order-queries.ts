import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/query-keys';
import {
  ordersApi,
  type OrderListParams,
  type OrderReturn,
  type OrderReturnRequestPayload,
} from '@/services/sdk';

export type CustomerReturn = OrderReturn & { orderNumber?: string };

export function useOrdersQuery(params?: OrderListParams) {
  return useQuery({
    queryKey: QUERY_KEYS.orders.list(params),
    queryFn: () => ordersApi.list(params),
    staleTime: 1000 * 30,
  });
}

export function useRecentOrdersQuery(limit = 3) {
  return useOrdersQuery({ page: 1, limit, sort: 'newest' });
}

export function useOrderQuery(id: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.orders.detail(id ?? 'none'),
    queryFn: () => ordersApi.getById(id!),
    enabled: Boolean(id),
    staleTime: 1000 * 30,
  });
}

export function useOrderTimelineQuery(id: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.orders.timeline(id ?? 'none'),
    queryFn: () => ordersApi.getTimeline(id!),
    enabled: Boolean(id),
    staleTime: 1000 * 30,
  });
}

export function useOrderInvoiceQuery(id: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.orders.invoice(id ?? 'none'),
    queryFn: () => ordersApi.getInvoice(id!),
    enabled: Boolean(id),
    staleTime: 1000 * 60,
  });
}

export function useOrderReturnsQuery(id: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.orders.returns(id ?? 'none'),
    queryFn: () => ordersApi.listReturns(id!),
    enabled: Boolean(id),
    staleTime: 1000 * 30,
  });
}

export function useCustomerReturnsQuery() {
  return useQuery({
    queryKey: QUERY_KEYS.orders.customerReturns(),
    queryFn: async (): Promise<CustomerReturn[]> => {
      const orders = await ordersApi.list({ limit: 50, sort: 'newest' });
      const eligible = orders.data.filter((order) =>
        ['delivered', 'completed', 'returned', 'refund_pending', 'refunded'].includes(order.status),
      );
      const returnsByOrder = await Promise.all(
        eligible.map(async (order) => {
          const returns = await ordersApi.listReturns(order.id);
          return returns.map((item) => ({ ...item, orderNumber: order.orderNumber }));
        }),
      );
      return returnsByOrder.flat();
    },
    staleTime: 1000 * 60,
  });
}

export function useCancelOrderMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => ordersApi.cancel(id, reason),
    onSuccess: (order) => {
      queryClient.setQueryData(QUERY_KEYS.orders.detail(order.id), order);
      queryClient.invalidateQueries({ queryKey: ['orders', 'list'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.orders.timeline(order.id) });
    },
  });
}

export function useRequestReturnMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, payload }: { orderId: string; payload: OrderReturnRequestPayload }) =>
      ordersApi.requestReturn(orderId, payload),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.orders.returns(variables.orderId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.orders.customerReturns() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.orders.detail(variables.orderId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.orders.timeline(variables.orderId) });
    },
  });
}
