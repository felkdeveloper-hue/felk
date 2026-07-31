import { useMutation, useQuery } from '@tanstack/react-query';
import { Download, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { AdminErrorState, AdminPageHeader, PageMotion, DataTable } from '@/components/admin';
import { TableSkeleton } from '@/components/admin/analytics';
import type { DataTableColumn } from '@/components/admin';
import { adminAnalyticsApi, type AnalyticsExportJob } from '@/services/sdk/admin';
import { formatDate } from '@/lib/utils';
import { AppError } from '@/lib/errors';

const baseColumns: DataTableColumn<AnalyticsExportJob>[] = [
  {
    id: 'reportTitle',
    header: 'Report',
    cell: (row) => (
      <div>
        <div className="font-medium">{row.reportTitle}</div>
        {row.drillLabel ? (
          <div className="text-muted-foreground text-xs">{row.drillLabel}</div>
        ) : null}
      </div>
    ),
  },
  {
    id: 'format',
    header: 'Format',
    cell: (row) => <span className="uppercase">{row.format}</span>,
  },
  {
    id: 'status',
    header: 'Status',
    cell: (row) => {
      const tone =
        row.status === 'ready'
          ? 'text-emerald-600'
          : row.status === 'failed'
            ? 'text-destructive'
            : 'text-amber-600';
      return <span className={`capitalize ${tone}`}>{row.status}</span>;
    },
  },
  {
    id: 'recordCount',
    header: 'Records',
    cell: (row) => row.recordCount.toLocaleString(),
  },
  {
    id: 'createdAt',
    header: 'Generated at',
    cell: (row) => formatDate(row.createdAt),
  },
];

export function AnalyticsExportsPage() {
  const query = useQuery({
    queryKey: ['analytics', 'exports'],
    queryFn: () => adminAnalyticsApi.listExports(),
    refetchInterval: (q) => (q.state.data?.some((j) => j.status === 'processing') ? 2500 : false),
  });

  const download = useMutation({
    mutationFn: (id: string) => adminAnalyticsApi.downloadExport(id),
    onSuccess: () => toast.success('Download started'),
    onError: (err) => toast.error(err instanceof AppError ? err.message : 'Download failed'),
  });

  const columns: DataTableColumn<AnalyticsExportJob>[] = [
    ...baseColumns,
    {
      id: 'actions',
      header: '',
      cell: (row) =>
        row.downloadAvailable ? (
          <button
            type="button"
            className="admin-btn admin-btn-secondary inline-flex items-center gap-1 text-xs"
            disabled={download.isPending}
            onClick={() => download.mutate(row.id)}
          >
            <Download className="h-3.5 w-3.5" />
            Download
          </button>
        ) : row.status === 'failed' ? (
          <span className="text-destructive text-xs">{row.error ?? 'Failed'}</span>
        ) : (
          <span className="text-muted-foreground text-xs">Processing…</span>
        ),
    },
  ];

  return (
    <PageMotion>
      <AdminPageHeader
        title="Export History"
        description="Downloads generated from analytics reports. Files remain available for a limited time."
        actions={
          <button
            type="button"
            className="admin-btn admin-btn-secondary inline-flex items-center gap-2"
            onClick={() => void query.refetch()}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        }
      />

      {query.isError ? (
        <AdminErrorState message="Failed to load export history." onRetry={() => query.refetch()} />
      ) : query.isLoading ? (
        <TableSkeleton />
      ) : (
        <div className="mt-4">
          <DataTable
            data={query.data ?? []}
            isLoading={query.isFetching}
            getRowId={(row) => row.id}
            columns={columns}
          />
          {!query.data?.length ? (
            <p className="text-muted-foreground mt-6 text-sm">
              No exports yet. Use Export on any analytics page to generate a report.
            </p>
          ) : null}
        </div>
      )}
    </PageMotion>
  );
}
