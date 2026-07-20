// @ts-nocheck
import { useQuery } from '@tanstack/react-query';
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
import { QUERY_KEYS } from '@/constants';
import { usePermissions } from '@/hooks';
import { formatCurrency, formatDate } from '@/lib/utils';
import { paymentsApi } from '@/services';

export function FinancePage() {
  const { payments: paymentPerms } = usePermissions();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');

  const params = useMemo(() => ({ page, limit: 20, status: status || undefined }), [page, status]);

  const query = useQuery({
    queryKey: QUERY_KEYS.payments.list(params),
    queryFn: () => paymentsApi.list(params),
  });

  if (query.isError) {
    return <AdminErrorState message="Unable to load payments." onRetry={() => query.refetch()} />;
  }

  return (
    <PageMotion>
      <AdminPageHeader title="Finance" description="Payments, refunds, settlements, and exports." />

      <ListToolbar
        status={status}
        onStatusChange={(value) => {
          setStatus(value);
          setPage(1);
        }}
        statusOptions={[
          { label: 'Paid', value: 'paid' },
          { label: 'Pending', value: 'pending' },
          { label: 'Refunded', value: 'refunded' },
          { label: 'Failed', value: 'failed' },
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
          { id: 'reference', header: 'Reference', cell: (row) => row.referenceNumber ?? row.id },
          { id: 'method', header: 'Method', cell: (row) => row.method },
          { id: 'status', header: 'Status', cell: (row) => row.status },
          {
            id: 'amount',
            header: 'Amount',
            cell: (row) => formatCurrency(row.amount, row.currency),
          },
          {
            id: 'date',
            header: 'Date',
            cell: (row) => (row.createdAt ? formatDate(row.createdAt) : '—'),
          },
          {
            id: 'actions',
            header: '',
            cell: () =>
              paymentPerms.refund ? (
                <Button variant="ghost" size="sm" disabled>
                  Refund
                </Button>
              ) : null,
          },
        ]}
      />

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <AdminPanel title="Settlements">
          <p className="text-sm text-neutral-600">
            Settlement batches and reconciliation summaries.
          </p>
        </AdminPanel>
        <AdminPanel title="Exports">
          <p className="text-sm text-neutral-600">
            CSV export for finance and accounting workflows.
          </p>
        </AdminPanel>
      </div>
    </PageMotion>
  );
}
