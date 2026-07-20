// @ts-nocheck
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import {
  AdminErrorState,
  AdminPageHeader,
  AdminStatCard,
  DataTable,
  ListToolbar,
  PageMotion,
} from '@/components/admin';
import { QUERY_KEYS } from '@/constants';
import { formatDate } from '@/lib/utils';
import { auditApi } from '@/services';

export function AuditListPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [resourceType, setResourceType] = useState('');

  const params = useMemo(
    () => ({
      page,
      limit: 25,
      q: search || undefined,
      resourceType: resourceType || undefined,
    }),
    [page, resourceType, search],
  );

  const query = useQuery({
    queryKey: QUERY_KEYS.audit.list(params),
    queryFn: () => auditApi.list(params),
  });

  if (query.isError) {
    return <AdminErrorState message="Unable to load audit logs." onRetry={() => query.refetch()} />;
  }

  const total = query.data?.meta.total ?? 0;

  return (
    <PageMotion>
      <AdminPageHeader
        title="Audit logs"
        description="Immutable activity timeline for compliance and troubleshooting."
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <AdminStatCard title="Events on this page" value={query.data?.data.length ?? 0} />
        <AdminStatCard title="Total events" value={total} />
        <AdminStatCard
          title="Latest"
          value={query.data?.data[0]?.createdAt ? formatDate(query.data.data[0].createdAt) : '—'}
        />
      </div>

      <ListToolbar
        search={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        searchPlaceholder="Search action, resource, request id…"
        status={resourceType}
        onStatusChange={(value) => {
          setResourceType(value);
          setPage(1);
        }}
        statusOptions={[
          { label: 'Products', value: 'products' },
          { label: 'Product variants', value: 'product_variants' },
          { label: 'Product media', value: 'product_media' },
          { label: 'Orders', value: 'orders' },
          { label: 'Users', value: 'users' },
          { label: 'Auth', value: 'auth' },
        ]}
        page={page}
        totalPages={query.data?.meta.totalPages ?? 1}
        onPageChange={setPage}
      />

      <DataTable
        data={query.data?.data ?? []}
        isLoading={query.isLoading}
        getRowId={(row) => row.id}
        emptyMessage="No audit events yet."
        columns={[
          {
            id: 'when',
            header: 'When',
            cell: (row) => (row.createdAt ? formatDate(row.createdAt) : '—'),
          },
          {
            id: 'action',
            header: 'Action',
            cell: (row) => (
              <span className="font-medium text-[var(--admin-ink)]">{row.action}</span>
            ),
          },
          {
            id: 'resource',
            header: 'Resource',
            cell: (row) => (
              <div>
                <p className="text-sm">{row.resourceType}</p>
                <p className="font-mono text-xs text-neutral-500 dark:text-neutral-400">
                  {row.resourceId ?? '—'}
                </p>
              </div>
            ),
          },
          {
            id: 'actor',
            header: 'Actor',
            cell: (row) => (
              <div>
                <p className="capitalize">{row.actorType}</p>
                <p className="font-mono text-xs text-neutral-500 dark:text-neutral-400">
                  {row.actorUserId ?? '—'}
                </p>
              </div>
            ),
          },
          {
            id: 'ip',
            header: 'IP',
            cell: (row) => row.ip ?? '—',
          },
        ]}
      />
    </PageMotion>
  );
}
