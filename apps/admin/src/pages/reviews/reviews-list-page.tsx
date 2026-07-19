import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Button } from '@fe-platform/ui';
import {
  AdminErrorState,
  AdminPageHeader,
  DataTable,
  ListToolbar,
  PageMotion,
} from '@/components/admin';
import { QUERY_KEYS } from '@/constants';
import { formatDate } from '@/lib/utils';
import { reviewsApi } from '@/services';

export function ReviewsListPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('pending');

  const params = useMemo(() => ({ page, limit: 20, status: status || undefined }), [page, status]);

  const query = useQuery({
    queryKey: QUERY_KEYS.reviews.list(params),
    queryFn: () => reviewsApi.list(params),
  });

  const moderateMutation = useMutation({
    mutationFn: ({ id, next }: { id: string; next: 'approved' | 'rejected' }) =>
      reviewsApi.moderate(id, next),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reviews'] }),
  });

  if (query.isError) {
    return <AdminErrorState message="Unable to load reviews." onRetry={() => query.refetch()} />;
  }

  return (
    <PageMotion>
      <AdminPageHeader
        title="Reviews"
        description="Approve or reject customer product reviews before they appear on the storefront."
      />

      <ListToolbar
        status={status}
        onStatusChange={(value) => {
          setStatus(value);
          setPage(1);
        }}
        statusOptions={[
          { label: 'Pending', value: 'pending' },
          { label: 'Approved', value: 'approved' },
          { label: 'Rejected', value: 'rejected' },
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
            id: 'rating',
            header: 'Rating',
            cell: (row) => `${row.rating}★`,
          },
          {
            id: 'body',
            header: 'Review',
            cell: (row) => (
              <div className="max-w-md">
                {row.title ? <p className="font-medium">{row.title}</p> : null}
                <p className="line-clamp-2 text-sm text-neutral-600">{row.body}</p>
                {row.images.length ? (
                  <p className="mt-1 text-xs text-neutral-500">{row.images.length} photo(s)</p>
                ) : null}
              </div>
            ),
          },
          {
            id: 'product',
            header: 'Product',
            cell: (row) => <span className="font-mono text-xs">{row.productId.slice(-8)}</span>,
          },
          {
            id: 'status',
            header: 'Status',
            cell: (row) => row.status,
          },
          {
            id: 'date',
            header: 'Submitted',
            cell: (row) => (row.createdAt ? formatDate(row.createdAt) : '—'),
          },
          {
            id: 'actions',
            header: '',
            cell: (row) =>
              row.status === 'pending' ? (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={moderateMutation.isPending}
                    onClick={() => moderateMutation.mutate({ id: row.id, next: 'approved' })}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={moderateMutation.isPending}
                    onClick={() => moderateMutation.mutate({ id: row.id, next: 'rejected' })}
                  >
                    Reject
                  </Button>
                </div>
              ) : (
                '—'
              ),
          },
        ]}
      />
    </PageMotion>
  );
}
