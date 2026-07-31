import { ArrowDown } from 'lucide-react';
import { AdminErrorState, AdminPageHeader, PageMotion } from '@/components/admin';
import {
  AnalyticsFilterBar,
  AnalyticsEmpty,
  KpiCardWithDelta,
  TableSkeleton,
  formatDuration,
  AnalyticsExportButton,
} from '@/components/admin/analytics';
import { usePaymentRecovery, useAnalyticsFilters } from '@/hooks/admin';

export function AnalyticsRecoveryPage() {
  const { filter, setFilter, clearFilters } = useAnalyticsFilters({ defaults: { period: '30d' } });
  const query = usePaymentRecovery(filter);
  const data = query.data;

  return (
    <PageMotion>
      <AdminPageHeader
        title="Payment Recovery"
        description="Checkout → failed payment → return → successful recovery funnel."
        actions={<AnalyticsExportButton reportType="recovery" filter={filter} />}
      />
      <AnalyticsFilterBar filter={filter} onChange={setFilter} onClear={clearFilters} />

      {query.isError ? (
        <AdminErrorState
          message="Failed to load recovery analytics."
          onRetry={() => query.refetch()}
        />
      ) : query.isLoading ? (
        <TableSkeleton />
      ) : !data ? (
        <AnalyticsEmpty />
      ) : (
        <div className="mt-4 space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <KpiCardWithDelta
              title="Recovery Rate"
              metric={{ value: data.recoveryRate, prev: 0, pctChange: 0 }}
              format={(v) => `${v}%`}
            />
            <KpiCardWithDelta
              title="Median Recovery Time"
              metric={{ value: data.medianRecoveryMs ?? 0, prev: 0, pctChange: 0 }}
              format={(v) => (v ? formatDuration(Number(v)) : '—')}
            />
            <KpiCardWithDelta
              title="Avg Recovery Time"
              metric={{ value: data.avgRecoveryMs ?? 0, prev: 0, pctChange: 0 }}
              format={(v) => (v ? formatDuration(Number(v)) : '—')}
            />
          </div>

          <div className="mx-auto flex max-w-md flex-col items-center gap-2 py-6">
            <FunnelStep label="Checkout Started" value={data.funnel.checkoutStarted} />
            <ArrowDown className="text-muted-foreground h-4 w-4" />
            <FunnelStep label="Payment Page Reached" value={data.funnel.paymentPageReached} />
            <ArrowDown className="text-muted-foreground h-4 w-4" />
            <FunnelStep label="Payment Failed" value={data.funnel.paymentFailed} />
            <ArrowDown className="text-muted-foreground h-4 w-4" />
            <FunnelStep label="Returned After Fail" value={data.funnel.returnedAfterFail} />
            <ArrowDown className="text-muted-foreground h-4 w-4" />
            <FunnelStep label="Payment Successful" value={data.funnel.paymentSuccessful} />
            <ArrowDown className="text-muted-foreground h-4 w-4" />
            <FunnelStep label="Recovered After Fail" value={data.funnel.recovered} highlight />
          </div>
        </div>
      )}
    </PageMotion>
  );
}

function FunnelStep({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`w-full rounded-lg border px-4 py-3 text-center ${
        highlight ? 'border-emerald-500/40 bg-emerald-500/5' : 'bg-card'
      }`}
    >
      <p className="text-muted-foreground text-xs uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value.toLocaleString()}</p>
    </div>
  );
}
