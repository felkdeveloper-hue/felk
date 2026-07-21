import { Link, useNavigate } from '@tanstack/react-router';
import {
  AdminErrorState,
  AdminPageHeader,
  AdminPanel,
  AdminStatCard,
  DataTable,
  PageMotion,
} from '@/components/admin';
import { ADMIN_ROUTES } from '@/constants';
import { useDashboardStatsQuery } from '@/hooks/admin';
import { formatCurrency, formatDate } from '@/lib/utils';

export function DashboardPage() {
  const navigate = useNavigate();
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
            <Link
              to={ADMIN_ROUTES.productNew}
              className="inline-flex h-9 items-center rounded-lg border border-[var(--admin-line)] bg-[var(--admin-panel)] px-3.5 text-sm font-medium transition hover:bg-white dark:hover:bg-white/10"
            >
              Add product
            </Link>
            <Link to={ADMIN_ROUTES.orders} className="admin-btn admin-btn-primary admin-btn-lg">
              View orders
            </Link>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard
          title="Revenue"
          value={formatCurrency(data?.revenue ?? 0)}
          hint="From recent payments"
          to={ADMIN_ROUTES.finance}
        />
        <AdminStatCard title="Orders" value={data?.orderCount ?? 0} to={ADMIN_ROUTES.orders} />
        <AdminStatCard
          title="Customers"
          value={data?.customerCount ?? 0}
          to={ADMIN_ROUTES.customers}
        />
        <AdminStatCard
          title="Products"
          value={data?.productCount ?? 0}
          to={ADMIN_ROUTES.products}
        />
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <AdminStatCard
          title="Low stock"
          value={data?.lowStock ?? 0}
          hint="SKUs at or below threshold"
          to={ADMIN_ROUTES.inventory}
        />
        <AdminStatCard
          title="Pending returns"
          value={data?.pendingReturns ?? 0}
          to={ADMIN_ROUTES.orders}
        />
        <AdminStatCard
          title="Inventory alerts"
          value={data?.alertCount ?? 0}
          to={ADMIN_ROUTES.inventory}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[2fr_1fr]">
        <AdminPanel title="Recent orders">
          <DataTable
            data={data?.recentOrders ?? []}
            isLoading={stats.isLoading}
            getRowId={(row) => row.id}
            onRowClick={(row) => {
              void navigate({ to: ADMIN_ROUTES.orderDetail, params: { orderId: row.id } });
            }}
            columns={[
              {
                id: 'order',
                header: 'Order',
                cell: (row) => (
                  <Link
                    to={ADMIN_ROUTES.orderDetail}
                    params={{ orderId: row.id }}
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
          <AdminPanel title="Performance">
            <div className="flex h-40 flex-col items-center justify-center rounded-xl border border-dashed border-[var(--admin-line)] bg-[var(--admin-surface)] px-6 text-center">
              <p className="text-sm font-medium text-[var(--admin-ink)]">Sales trend</p>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                Charts will appear once report data is connected.
              </p>
            </div>
          </AdminPanel>
          <AdminPanel title="Recent activity">
            <ul className="space-y-3 text-sm text-neutral-600 dark:text-neutral-300">
              {(data?.recentPayments ?? []).slice(0, 5).map((payment) => (
                <li key={payment.id}>
                  <Link
                    to={ADMIN_ROUTES.finance}
                    className="flex items-start gap-3 border-b border-[var(--admin-line)] pb-3 transition last:border-0 last:pb-0 hover:text-[var(--admin-accent)]"
                  >
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--admin-accent)]" />
                    <span>
                      Payment {payment.referenceNumber ?? payment.id}
                      <span className="text-neutral-400 dark:text-neutral-500">
                        {' '}
                        · {payment.status}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
              {!stats.isLoading && (data?.recentPayments?.length ?? 0) === 0 ? (
                <li className="text-neutral-500 dark:text-neutral-400">
                  No recent payment activity.
                </li>
              ) : null}
            </ul>
          </AdminPanel>
        </div>
      </div>
    </PageMotion>
  );
}
