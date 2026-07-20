import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import {
  AdminErrorState,
  AdminPageHeader,
  DataTable,
  ListToolbar,
  PageMotion,
} from '@/components/admin';
import { QUERY_KEYS } from '@/constants';
import { cn, formatDate } from '@/lib/utils';
import type { createCmsResourceApi } from '@/services/sdk/admin';
import type { CmsResource } from '@/services/sdk/admin';

type CmsApi = ReturnType<typeof createCmsResourceApi>;

function draftPayload(resourceKey: string, title: string): Record<string, unknown> {
  const stamp = Date.now();
  switch (resourceKey) {
    case 'hero-banners':
    case 'promo-banners':
      return {
        title: `New ${title.replace(/s$/, '')}`,
        status: 'draft',
        priority: 0,
      };
    case 'home-sections':
      return {
        key: `section-${stamp}`,
        title: `New ${title.replace(/s$/, '')}`,
        status: 'draft',
      };
    case 'faqs':
      return {
        question: 'New FAQ question?',
        answer: 'Add the answer here.',
        status: 'draft',
      };
    case 'announcements':
      return {
        title: `New ${title.replace(/s$/, '')}`,
        body: 'Announcement body',
        status: 'draft',
      };
    default:
      return {
        name: `New ${title.replace(/s$/, '')}`,
        slug: `new-${resourceKey}-${stamp}`,
        status: 'draft',
      };
  }
}

export function CmsResourceListPage({
  title,
  description,
  resourceKey,
  api,
  canCreate,
  canDelete,
  detailPath,
  showImage,
}: {
  title: string;
  description: string;
  resourceKey: string;
  api: CmsApi;
  canCreate?: boolean;
  canDelete?: boolean;
  detailPath?: string;
  showImage?: boolean;
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
    queryKey: QUERY_KEYS.adminCms.resource(resourceKey, params),
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
            <button
              type="button"
              className="admin-btn admin-btn-primary admin-btn-lg"
              disabled={createMutation.isPending}
              onClick={() => createMutation.mutate(draftPayload(resourceKey, title))}
            >
              {createMutation.isPending ? 'Creating…' : 'Create'}
            </button>
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
              { label: 'Active', value: 'active' },
              { label: 'Published', value: 'published' },
              { label: 'Archived', value: 'archived' },
            ]}
            page={page}
            totalPages={query.data?.meta.totalPages ?? 1}
            onPageChange={setPage}
            bulkActions={
              canDelete && selectedIds.length > 0 ? (
                <button
                  type="button"
                  className="admin-btn bg-red-600 text-white hover:bg-red-700"
                  onClick={() => void bulkDelete()}
                >
                  Delete selected ({selectedIds.length})
                </button>
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
            emptyMessage={`No ${title.toLowerCase()} yet.`}
            columns={[
              ...(showImage
                ? [
                    {
                      id: 'image',
                      header: 'Image',
                      cell: (row: CmsResource) =>
                        row.imageUrl ? (
                          <img
                            src={row.imageUrl}
                            alt={row.name || 'Category'}
                            className="size-12 rounded-lg object-cover"
                          />
                        ) : (
                          <span className="text-xs text-neutral-500">No image</span>
                        ),
                    },
                  ]
                : []),
              {
                id: 'name',
                header: 'Name',
                cell: (row) =>
                  detailPath ? (
                    <Link
                      to={detailPath.replace('$categoryId', row.id).replace('$id', row.id)}
                      className="font-medium text-[var(--admin-ink)] hover:underline"
                    >
                      {row.name || '—'}
                    </Link>
                  ) : (
                    <span className="font-medium text-[var(--admin-ink)]">{row.name || '—'}</span>
                  ),
              },
              { id: 'slug', header: 'Slug / key', cell: (row) => row.slug ?? '—' },
              {
                id: 'status',
                header: 'Status',
                cell: (row) => (
                  <span
                    className={cn(
                      'inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize',
                      'bg-[var(--admin-panel-soft)] text-[var(--admin-ink)]',
                    )}
                  >
                    {row.status ?? '—'}
                  </span>
                ),
              },
              {
                id: 'updated',
                header: 'Updated',
                cell: (row) => (row.updatedAt ? formatDate(row.updatedAt) : '—'),
              },
              {
                id: 'actions',
                header: 'Actions',
                cell: (row) => (
                  <div className="flex items-center gap-2">
                    {detailPath ? (
                      <Link
                        to={detailPath.replace('$categoryId', row.id).replace('$id', row.id)}
                        className="admin-btn"
                      >
                        Edit
                      </Link>
                    ) : null}
                    {canDelete ? (
                      <button
                        type="button"
                        className="admin-btn admin-btn-danger"
                        onClick={() => {
                          if (window.confirm(`Delete “${row.name || row.id}”?`)) {
                            removeMutation.mutate(row.id);
                          }
                        }}
                        disabled={removeMutation.isPending}
                      >
                        Delete
                      </button>
                    ) : null}
                  </div>
                ),
              },
            ]}
          />
        </>
      )}
    </PageMotion>
  );
}
