import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { QUERY_KEYS } from '@/constants';
import { formatDate } from '@/lib/utils';
import type { createCmsResourceApi } from '@/services';
import type { CmsResource } from '@/services';

type CmsApi = ReturnType<typeof createCmsResourceApi>;

export function CmsResourceListPage({
  title,
  description,
  resourceKey,
  api,
  canCreate,
  canDelete,
  detailPath,
}: {
  title: string;
  description: string;
  resourceKey: string;
  api: CmsApi;
  canCreate?: boolean;
  canDelete?: boolean;
  detailPath?: string;
}) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const params = useMemo(
    () => ({
      page,
      limit: 20,
      q: search || undefined,
      status: status || undefined,
    }),
    [page, search, status],
  );

  const query = useQuery({
    queryKey: QUERY_KEYS.cms.resource(resourceKey, params),
    queryFn: () => api.list(params),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => api.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cms', resourceKey] }),
  });

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.create(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cms', resourceKey] }),
  });

  const toggleRow = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  };

  const toggleAll = () => {
    const rows = query.data?.data ?? [];
    setSelectedIds((current) => (current.length === rows.length ? [] : rows.map((row) => row.id)));
  };

  const bulkDelete = async () => {
    await Promise.all(selectedIds.map((id) => removeMutation.mutateAsync(id)));
    setSelectedIds([]);
  };

  return (
    <PageMotion>
      <AdminPageHeader
        title={title}
        description={description}
        actions={
          canCreate ? (
            <Button
              size="sm"
              disabled={createMutation.isPending}
              onClick={() =>
                createMutation.mutate({
                  name: `New ${title.replace(/s$/, '')}`,
                  slug: `new-${resourceKey}-${Date.now()}`,
                  status: 'draft',
                })
              }
            >
              Create
            </Button>
          ) : null
        }
      />

      {query.isError ? (
        <AdminErrorState message="Unable to load records." onRetry={() => query.refetch()} />
      ) : (
        <>
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
              { label: 'Draft', value: 'draft' },
              { label: 'Published', value: 'published' },
              { label: 'Archived', value: 'archived' },
            ]}
            page={page}
            totalPages={query.data?.meta.totalPages ?? 1}
            onPageChange={setPage}
            bulkActions={
              canDelete && selectedIds.length > 0 ? (
                <Button variant="destructive" size="sm" onClick={bulkDelete}>
                  Delete selected ({selectedIds.length})
                </Button>
              ) : null
            }
          />

          <DataTable<CmsResource>
            data={query.data?.data ?? []}
            isLoading={query.isLoading}
            selectedIds={canDelete ? selectedIds : undefined}
            onToggleRow={canDelete ? toggleRow : undefined}
            onToggleAll={canDelete ? toggleAll : undefined}
            getRowId={(row) => row.id}
            columns={[
              {
                id: 'name',
                header: 'Name',
                cell: (row) =>
                  detailPath ? (
                    <Link
                      to={detailPath.replace('$id', row.id)}
                      className="font-medium text-neutral-900 hover:underline"
                    >
                      {row.name}
                    </Link>
                  ) : (
                    row.name
                  ),
              },
              { id: 'slug', header: 'Slug', cell: (row) => row.slug ?? '—' },
              { id: 'status', header: 'Status', cell: (row) => row.status ?? '—' },
              {
                id: 'updated',
                header: 'Updated',
                cell: (row) => (row.updatedAt ? formatDate(row.updatedAt) : '—'),
              },
              {
                id: 'actions',
                header: '',
                cell: (row) =>
                  canDelete ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMutation.mutate(row.id)}
                      disabled={removeMutation.isPending}
                    >
                      Delete
                    </Button>
                  ) : null,
              },
            ]}
          />

          <div className="mt-6">
            <AdminPanel title="SEO">
              <p className="text-sm text-neutral-600">
                SEO metadata is managed per record in the full editor. Connect detail routes when
                backend fields are exposed in the admin SDK.
              </p>
            </AdminPanel>
          </div>
        </>
      )}
    </PageMotion>
  );
}
