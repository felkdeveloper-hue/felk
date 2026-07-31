import { ArrowDown } from 'lucide-react';
import { AdminErrorState, AdminPageHeader, PageMotion } from '@/components/admin';
import {
  AnalyticsFilterBar,
  AnalyticsEmpty,
  TableSkeleton,
  AnalyticsExportButton,
} from '@/components/admin/analytics';
import { useProductFunnel, useAnalyticsFilters } from '@/hooks/admin';

export function AnalyticsFunnelPage() {
  const { filter, setFilter, clearFilters } = useAnalyticsFilters({ defaults: { period: '30d' } });
  const query = useProductFunnel(filter);
  const data = query.data;

  return (
    <PageMotion>
      <AdminPageHeader
        title="Product Conversion Funnel"
        description="View → Click → Wishlist → Cart → Checkout → Payment → Delivered with drop-off at each stage."
        actions={<AnalyticsExportButton reportType="funnel" filter={filter} />}
      />
      <AnalyticsFilterBar
        filter={filter}
        onChange={setFilter}
        onClear={clearFilters}
        visible={['period', 'productId', 'category', 'brandId', 'device', 'country']}
      />

      {query.isError ? (
        <AdminErrorState message="Failed to load funnel." onRetry={() => query.refetch()} />
      ) : query.isLoading ? (
        <TableSkeleton />
      ) : !data ? (
        <AnalyticsEmpty />
      ) : (
        <div className="mx-auto mt-6 flex max-w-lg flex-col items-center gap-2 py-4">
          {data.stages.map((stage, idx) => (
            <div key={stage.key} className="flex w-full flex-col items-center">
              <div className="bg-card w-full rounded-lg border px-4 py-3 text-center">
                <p className="text-muted-foreground text-xs uppercase tracking-wide">
                  {stage.label}
                </p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">
                  {stage.count.toLocaleString()}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {stage.conversionFromTop}% of top · Drop-off {stage.dropOffPct}%
                </p>
              </div>
              {idx < data.stages.length - 1 ? (
                <ArrowDown className="text-muted-foreground my-1 h-4 w-4" />
              ) : null}
            </div>
          ))}
        </div>
      )}
    </PageMotion>
  );
}
