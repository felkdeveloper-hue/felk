import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { PackageOpen } from 'lucide-react';
import { Seo } from '@/components/common/seo';
import { OrderListFilters, OrderListItem, OrderNotificationBanners } from '@/components/orders';
import { AccountPageHeader } from '@/components/account/account-page-header';
import { AuthErrorAlert } from '@/components/auth/auth-error-alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ROUTES } from '@/constants';
import { useOrdersQuery } from '@/hooks/orders';
import type { OrderStatus } from '@/services/sdk';

export function AccountOrdersPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, sort]);

  const ordersQuery = useOrdersQuery({
    page,
    limit: 10,
    q: debouncedSearch || undefined,
    status: status === 'all' ? undefined : (status as OrderStatus),
    sort,
  });

  const orders = ordersQuery.data?.data ?? [];
  const meta = ordersQuery.data?.meta;

  return (
    <>
      <Seo title="Orders" description="View your order history." noIndex />

      <AccountPageHeader
        title="Orders"
        description="Track purchases, view details, and manage returns."
      />

      <div className="mb-6 flex flex-wrap gap-3">
        <Button asChild variant="outline">
          <Link to={ROUTES.accountReturns}>Return history</Link>
        </Button>
      </div>

      <OrderNotificationBanners />

      <OrderListFilters
        search={search}
        status={status}
        sort={sort}
        onSearchChange={setSearch}
        onStatusChange={setStatus}
        onSortChange={setSort}
      />

      <div className="mt-8">
        {ordersQuery.error ? (
          <AuthErrorAlert error={ordersQuery.error} onRetry={() => ordersQuery.refetch()} />
        ) : null}

        {ordersQuery.isLoading ? (
          <div className="space-y-4" aria-busy="true">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-28 w-full" />
            ))}
          </div>
        ) : null}

        {!ordersQuery.isLoading && orders.length === 0 ? (
          <div className="border-border rounded-xl border border-dashed p-10 text-center">
            <PackageOpen className="text-muted-foreground mx-auto size-10" aria-hidden />
            <h2 className="mt-4 font-medium">No orders yet</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              {debouncedSearch || status !== 'all'
                ? 'Try adjusting your search or filters.'
                : 'When you place an order, it will appear here.'}
            </p>
            <Button asChild className="mt-4">
              <Link to={ROUTES.products}>Start shopping</Link>
            </Button>
          </div>
        ) : null}

        {orders.length > 0 ? (
          <ul className="space-y-4">
            {orders.map((order, index) => (
              <OrderListItem key={order.id} order={order} index={index} />
            ))}
          </ul>
        ) : null}

        {meta && meta.totalPages > 1 ? (
          <div className="mt-8 flex items-center justify-between gap-3">
            <Button
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Previous
            </Button>
            <p className="text-muted-foreground text-sm">
              Page {meta.page} of {meta.totalPages}
            </p>
            <Button
              variant="outline"
              disabled={page >= meta.totalPages}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </Button>
          </div>
        ) : null}
      </div>
    </>
  );
}
