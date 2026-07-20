// @ts-nocheck
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Button } from '@fe-platform/ui';
import { AdminErrorState, AdminPageHeader, AdminPanel, PageMotion } from '@/components/admin';
import { ADMIN_ROUTES, QUERY_KEYS } from '@/constants';
import { formatDate } from '@/lib/utils';
import { customersApi } from '@/services';

export function CustomerDetailPage({ customerId }: { customerId: string }) {
  const query = useQuery({
    queryKey: QUERY_KEYS.customers.detail(customerId),
    queryFn: () => customersApi.getById(customerId),
  });

  if (query.isError) {
    return <AdminErrorState message="Unable to load customer." onRetry={() => query.refetch()} />;
  }

  const customer = query.data;

  return (
    <PageMotion>
      <AdminPageHeader
        title={
          [customer?.firstName, customer?.lastName].filter(Boolean).join(' ') ||
          customer?.email ||
          'Customer'
        }
        description={customer?.email}
        actions={
          <Link to={ADMIN_ROUTES.customers}>
            <Button variant="outline" size="sm">
              Back to customers
            </Button>
          </Link>
        }
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <AdminPanel title="Profile">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-500">Email</dt>
              <dd>{customer?.email}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-500">Phone</dt>
              <dd>{customer?.phone ?? '—'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-500">Status</dt>
              <dd>{customer?.status ?? '—'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-500">Joined</dt>
              <dd>{customer?.createdAt ? formatDate(customer.createdAt) : '—'}</dd>
            </div>
          </dl>
        </AdminPanel>

        <AdminPanel title="Addresses">
          <p className="text-sm text-neutral-600">
            Customer address book will render from the customer detail API.
          </p>
        </AdminPanel>
        <AdminPanel title="Orders">
          <p className="text-sm text-neutral-600">Recent orders filtered by customer ID.</p>
        </AdminPanel>
        <AdminPanel title="Wishlist & activity">
          <p className="text-sm text-neutral-600">
            Wishlist items, tags, and staff notes placeholders.
          </p>
        </AdminPanel>
      </div>
    </PageMotion>
  );
}
