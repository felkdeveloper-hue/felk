// @ts-nocheck
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
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
import { formatDate } from '@/lib/utils';
import { customersApi } from '@/services';

export function CustomersListPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const params = useMemo(() => ({ page, limit: 20, q: search || undefined }), [page, search]);

  const query = useQuery({
    queryKey: QUERY_KEYS.customers.list(params),
    queryFn: () => customersApi.list(params),
  });

  if (query.isError) {
    return <AdminErrorState message="Unable to load customers." onRetry={() => query.refetch()} />;
  }

  return (
    <PageMotion>
      <AdminPageHeader
        title="Customers"
        description="Browse customer profiles, orders, and activity."
      />

      <ListToolbar
        search={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
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
            id: 'name',
            header: 'Customer',
            cell: (row) => (
              <Link
                to={ADMIN_ROUTES.customerDetail.replace('$customerId', row.id)}
                className="font-medium hover:underline"
              >
                {[row.firstName, row.lastName].filter(Boolean).join(' ') || row.email}
              </Link>
            ),
          },
          { id: 'email', header: 'Email', cell: (row) => row.email },
          { id: 'phone', header: 'Phone', cell: (row) => row.phone ?? '—' },
          { id: 'status', header: 'Status', cell: (row) => row.status ?? '—' },
          {
            id: 'joined',
            header: 'Joined',
            cell: (row) => (row.createdAt ? formatDate(row.createdAt) : '—'),
          },
          {
            id: 'actions',
            header: '',
            cell: (row) => (
              <Link to={ADMIN_ROUTES.customerDetail.replace('$customerId', row.id)}>
                <Button variant="ghost" size="sm">
                  View
                </Button>
              </Link>
            ),
          },
        ]}
      />
    </PageMotion>
  );
}
