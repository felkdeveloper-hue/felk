import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { Button } from '@fe-platform/ui';
import {
  AdminErrorState,
  AdminPageHeader,
  DataTable,
  ListToolbar,
  PageMotion,
} from '@/components/admin';
import { ADMIN_ROUTES, QUERY_KEYS } from '@/constants';
import { useAdminPermissions } from '@/hooks/admin';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { formatOrderAddress, ordersApi } from '@/services/sdk/admin';

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
        status === 'pending' && 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
        status === 'confirmed' && 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
        status === 'shipped' && 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
        status === 'delivered' && 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
        status === 'cancelled' && 'bg-red-500/15 text-red-700 dark:text-red-300',
        !['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'].includes(status) &&
          'bg-neutral-500/15 text-neutral-600 dark:text-neutral-300',
      )}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}

export function OrdersListPage() {
  const navigate = useNavigate();
  const { orders: orderPerms } = useAdminPermissions();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const params = useMemo(
    () => ({ page, limit: 20, q: search || undefined, status: status || undefined }),
    [page, search, status],
  );

  const query = useQuery({
    queryKey: QUERY_KEYS.adminOrders.list(params),
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
          { label: 'Confirmed', value: 'confirmed' },
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
        onRowClick={(row) => {
          void navigate({ to: ADMIN_ROUTES.orderDetail, params: { orderId: row.id } });
        }}
        columns={[
          {
            id: 'order',
            header: 'Order',
            cell: (row) => (
              <div className="min-w-[9rem]">
                <Link
                  to={ADMIN_ROUTES.orderDetail}
                  params={{ orderId: row.id }}
                  className="font-medium hover:underline"
                >
                  {row.orderNumber}
                </Link>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {row.createdAt ? formatDate(row.createdAt) : '—'}
                </p>
              </div>
            ),
          },
          {
            id: 'customer',
            header: 'Customer',
            cell: (row) => (
              <div className="min-w-[8rem]">
                <p className="font-medium">{row.shippingAddress?.fullName ?? '—'}</p>
                {row.shippingAddress?.phone ? (
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {row.shippingAddress.phone}
                  </p>
                ) : null}
              </div>
            ),
          },
          {
            id: 'address',
            header: 'Ship to',
            className: 'max-w-[14rem]',
            cell: (row) => (
              <p className="text-muted-foreground line-clamp-2 text-xs leading-relaxed">
                {formatOrderAddress(row.shippingAddress)}
              </p>
            ),
          },
          {
            id: 'status',
            header: 'Status',
            cell: (row) => <StatusBadge status={row.status} />,
          },
          {
            id: 'payment',
            header: 'Payment',
            cell: (row) => (
              <div className="min-w-[5rem]">
                <p className="capitalize">{row.paymentMethod?.replace(/_/g, ' ') ?? '—'}</p>
                {row.shippingMethod ? (
                  <p className="text-muted-foreground mt-0.5 text-xs capitalize">
                    {row.shippingMethod.replace(/_/g, ' ')} shipping
                  </p>
                ) : null}
              </div>
            ),
          },
          {
            id: 'items',
            header: 'Items',
            cell: (row) => row.itemCount,
          },
          {
            id: 'total',
            header: 'Total',
            cell: (row) => (
              <span className="font-medium tabular-nums">
                {formatCurrency(row.grandTotal, row.currency)}
              </span>
            ),
          },
          {
            id: 'actions',
            header: '',
            cell: (row) =>
              orderPerms.update ? (
                <Link to={ADMIN_ROUTES.orderDetail} params={{ orderId: row.id }}>
                  <Button variant="ghost" size="sm">
                    View
                  </Button>
                </Link>
              ) : null,
          },
        ]}
      />
    </PageMotion>
  );
}
