import { Link } from '@tanstack/react-router';
import { RotateCcw } from 'lucide-react';
import { Seo } from '@/components/common/seo';
import { ReturnStatusBadge } from '@/components/orders';
import { AccountPageHeader } from '@/components/account/account-page-header';
import { AuthErrorAlert } from '@/components/auth/auth-error-alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ROUTES } from '@/constants';
import { useCustomerReturnsQuery } from '@/hooks/orders';
import { formatDate } from '@/utils/format';

export function AccountReturnsPage() {
  const returnsQuery = useCustomerReturnsQuery();
  const returns = returnsQuery.data ?? [];

  return (
    <>
      <Seo title="Returns" description="View your return request history." noIndex />

      <AccountPageHeader title="Returns" description="Track return requests and their status." />

      <div className="mb-6">
        <Button asChild variant="outline">
          <Link to={ROUTES.accountOrders}>Back to orders</Link>
        </Button>
      </div>

      {returnsQuery.error ? (
        <AuthErrorAlert error={returnsQuery.error} onRetry={() => returnsQuery.refetch()} />
      ) : null}

      {returnsQuery.isLoading ? (
        <div className="space-y-4" aria-busy="true">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : null}

      {!returnsQuery.isLoading && returns.length === 0 ? (
        <div className="border-border rounded-xl border border-dashed p-10 text-center">
          <RotateCcw className="text-muted-foreground mx-auto size-10" aria-hidden />
          <h2 className="mt-4 font-medium">No return requests</h2>
          <p className="text-muted-foreground mt-2 text-sm">
            Return requests for delivered orders will appear here.
          </p>
          <Button asChild className="mt-4">
            <Link to={ROUTES.accountOrders}>View orders</Link>
          </Button>
        </div>
      ) : null}

      {returns.length > 0 ? (
        <ul className="space-y-4">
          {returns.map((item) => (
            <li key={item.id} className="border-border bg-card rounded-xl border p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <ReturnStatusBadge status={item.status} />
                    {'orderNumber' in item && typeof item.orderNumber === 'string' ? (
                      <span className="text-sm font-medium">{item.orderNumber}</span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm">{item.reason}</p>
                  {item.createdAt ? (
                    <p className="text-muted-foreground mt-1 text-xs">
                      Requested {formatDate(item.createdAt)}
                    </p>
                  ) : null}
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link to="/account/orders/$orderId" params={{ orderId: item.orderId }}>
                    View order
                  </Link>
                </Button>
              </div>
              {item.history.length > 0 ? (
                <ol className="border-border mt-4 space-y-2 border-t pt-4 text-sm">
                  {item.history.map((entry, index) => (
                    <li key={`${entry.status}-${index}`} className="flex justify-between gap-4">
                      <span className="capitalize">{entry.status.replace('_', ' ')}</span>
                      <span className="text-muted-foreground">{formatDate(entry.at)}</span>
                    </li>
                  ))}
                </ol>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}
