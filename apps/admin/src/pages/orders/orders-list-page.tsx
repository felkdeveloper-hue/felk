import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { Button } from '@fe-platform/ui';
import {
  AdminErrorState,
  AdminPageHeader,
  AdminPanel,
  DataTable,
  ListToolbar,
  PageMotion,
} from '@/components/admin';
import { ADMIN_ROUTES, QUERY_KEYS } from '@/constants';
import { usePermissions } from '@/hooks';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ordersApi } from '@/services';

export function OrdersListPage() {
  const { orders: orderPerms } = usePermissions();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const params = useMemo(
    () => ({ page, limit: 20, q: search || undefined, status: status || undefined }),
    [page, search, status],
  );

  const query = useQuery({
    queryKey: QUERY_KEYS.orders.list(params),
    queryFn: () => ordersApi.list(params),
  });

  if (query.isError) {
    return <AdminErrorState message="Unable to load orders." onRetry={() => query.refetch()} />;
  }

  return (
    <PageMotion>
      <AdminPageHeader title="Orders" description="Review, filter, and update customer orders." />

      <ListToolbar
        search={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        status={status}
        onStatusChange={(value) => {
          setStatus(value);
          setPage(1);
        }}
        statusOptions={[
          { label: 'Pending', value: 'pending' },
          { label: 'Processing', value: 'processing' },
          { label: 'Shipped', value: 'shipped' },
          { label: 'Delivered', value: 'delivered' },
          { label: 'Cancelled', value: 'cancelled' },
        ]}
        page={page}
        totalPages={query.data?.meta.totalPages ?? 1}
        onPageChange={setPage}
      />

      <DataTable
        data={query.data?.data ?? []}
        isLoading={query.isLoading}
        getRowId={(row) => row.id}
        columns={[
          {
            id: 'order',
            header: 'Order',
            cell: (row) => (
              <Link
                to={ADMIN_ROUTES.orderDetail.replace('$orderId', row.id)}
                className="font-medium hover:underline"
              >
                {row.orderNumber}
              </Link>
            ),
          },
          { id: 'status', header: 'Status', cell: (row) => row.status },
          { id: 'items', header: 'Items', cell: (row) => row.itemCount },
          {
            id: 'total',
            header: 'Total',
            cell: (row) => formatCurrency(row.grandTotal, row.currency),
          },
          {
            id: 'date',
            header: 'Placed',
            cell: (row) => (row.createdAt ? formatDate(row.createdAt) : '—'),
          },
          {
            id: 'actions',
            header: '',
            cell: (row) =>
              orderPerms.update ? (
                <Link to={ADMIN_ROUTES.orderDetail.replace('$orderId', row.id)}>
                  <Button variant="ghost" size="sm">
                    Manage
                  </Button>
                </Link>
              ) : null,
          },
        ]}
      />

      <div className="mt-6">
        <AdminPanel title="Advanced filters">
          <p className="text-sm text-neutral-600">
            Payment method, date range, and customer filters can be added here.
          </p>
        </AdminPanel>
      </div>
    </PageMotion>
  );
}
