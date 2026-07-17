import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants';
import { customersApi, inventoryApi, ordersApi, paymentsApi, productsApi } from '@/services';

export function useDashboardStatsQuery() {
  return useQuery({
    queryKey: QUERY_KEYS.dashboard.stats(),
    queryFn: async () => {
      const [orders, products, customers, payments, inventory, alerts] = await Promise.all([
        ordersApi
          .list({ page: 1, limit: 5 })
          .catch(() => ({ data: [], meta: { total: 0 } as never })),
        productsApi
          .list({ page: 1, limit: 1 })
          .catch(() => ({ data: [], meta: { total: 0 } as never })),
        customersApi
          .list({ page: 1, limit: 1 })
          .catch(() => ({ data: [], meta: { total: 0 } as never })),
        paymentsApi
          .list({ page: 1, limit: 5 })
          .catch(() => ({ data: [], meta: { total: 0 } as never })),
        inventoryApi
          .listItems({ page: 1, limit: 100 })
          .catch(() => ({ data: [], meta: { total: 0 } as never })),
        inventoryApi.listAlerts().catch(() => []),
      ]);

      const revenue = payments.data
        .filter((payment) => payment.status === 'paid')
        .reduce((sum, payment) => sum + payment.amount, 0);

      const lowStock = inventory.data.filter((item) => item.quantityAvailable <= 5).length;
      const pendingReturns = orders.data.filter((order) =>
        ['returned', 'refund_pending'].includes(order.status),
      ).length;

      return {
        revenue,
        orderCount: orders.meta.total,
        customerCount: customers.meta.total,
        productCount: products.meta.total,
        lowStock,
        pendingReturns,
        alertCount: Array.isArray(alerts) ? alerts.length : 0,
        recentOrders: orders.data,
        recentPayments: payments.data,
      };
    },
    staleTime: 1000 * 30,
  });
}
