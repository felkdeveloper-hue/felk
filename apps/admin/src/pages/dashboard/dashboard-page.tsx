import { Link } from '@tanstack/react-router';
import { Button } from '@fe-platform/ui';
import {
  AdminErrorState,
  AdminPageHeader,
  AdminPanel,
  AdminStatCard,
  DataTable,
  PageMotion,
} from '@/components/admin';
import { ADMIN_ROUTES } from '@/constants';
import { useDashboardStatsQuery } from '@/hooks';
import { formatCurrency, formatDate } from '@/lib/utils';

export function DashboardPage() {
  const stats = useDashboardStatsQuery();

  if (stats.isError) {
    return (
      <AdminErrorState
        message="Unable to load dashboard metrics."
        onRetry={() => stats.refetch()}
      />
    );
  }

  const data = stats.data;

  return (
    <PageMotion>
      <AdminPageHeader
        title="Dashboard"
        description="Overview of store performance, inventory health, and recent activity."
        actions={
          <>
            <Link to={ADMIN_ROUTES.productNew}>
              <Button variant="outline" size="sm">
                Add product
              </Button>
            </Link>
            <Link to={ADMIN_ROUTES.orders}>
              <Button variant="outline" size="sm">
                View orders
              </Button>
            </Link>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard
          title="Revenue"
          value={formatCurrency(data?.revenue ?? 0)}
          hint="From recent payments"
        />
        <AdminStatCard title="Orders" value={data?.orderCount ?? 0} />
        <AdminStatCard title="Customers" value={data?.customerCount ?? 0} />
        <AdminStatCard title="Products" value={data?.productCount ?? 0} />
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <AdminStatCard
          title="Low stock"
          value={data?.lowStock ?? 0}
          hint="SKUs at or below threshold"
        />
        <AdminStatCard title="Pending returns" value={data?.pendingReturns ?? 0} />
        <AdminStatCard title="Inventory alerts" value={data?.alertCount ?? 0} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[2fr_1fr]">
        <AdminPanel title="Recent orders">
          <DataTable
            data={data?.recentOrders ?? []}
            isLoading={stats.isLoading}
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
              {
                id: 'total',
                header: 'Total',
                cell: (row) => formatCurrency(row.grandTotal, row.currency),
              },
              {
                id: 'date',
                header: 'Date',
                cell: (row) => (row.createdAt ? formatDate(row.createdAt) : '—'),
              },
            ]}
          />
        </AdminPanel>

        <div className="space-y-6">
          <AdminPanel title="Charts">
            <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-neutral-200 bg-neutral-50 text-sm text-neutral-500">
              Sales chart placeholder
            </div>
          </AdminPanel>
          <AdminPanel title="Recent activity">
            <ul className="space-y-3 text-sm text-neutral-600">
              {(data?.recentPayments ?? []).slice(0, 5).map((payment) => (
                <li key={payment.id}>
                  Payment {payment.referenceNumber ?? payment.id} · {payment.status}
                </li>
              ))}
              {!stats.isLoading && (data?.recentPayments?.length ?? 0) === 0 ? (
                <li>No recent payment activity.</li>
              ) : null}
            </ul>
          </AdminPanel>
        </div>
      </div>
    </PageMotion>
  );
}
