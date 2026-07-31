import { ArrowDown } from 'lucide-react';
import { AdminErrorState, AdminPageHeader, PageMotion, DataTable } from '@/components/admin';
import {
  AnalyticsFilterBar,
  AnalyticsEmpty,
  TableSkeleton,
  KpiCardWithDelta,
  AnalyticsChartCard,
  formatDuration,
  AnalyticsExportButton,
} from '@/components/admin/analytics';
import { useCheckoutAbandon, useAnalyticsFilters } from '@/hooks/admin';

export function AnalyticsCheckoutPage() {
  const { filter, setFilter, clearFilters } = useAnalyticsFilters({ defaults: { period: '30d' } });
  const query = useCheckoutAbandon(filter);
  const data = query.data;

  return (
    <PageMotion>
      <AdminPageHeader
        title="Abandoned Checkout"
        description="Where customers leave checkout, return timing, and recovered revenue."
        actions={<AnalyticsExportButton reportType="checkout" filter={filter} />}
      />
      <AnalyticsFilterBar filter={filter} onChange={setFilter} onClear={clearFilters} />

      {query.isError ? (
        <AdminErrorState
          message="Failed to load checkout analytics."
          onRetry={() => query.refetch()}
        />
      ) : query.isLoading ? (
        <TableSkeleton />
      ) : !data ? (
        <AnalyticsEmpty />
      ) : (
        <div className="mt-4 space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCardWithDelta
              title="Abandon Rate"
              metric={{ value: data.abandonRate, prev: 0, pctChange: 0 }}
              format={(v) => `${v}%`}
            />
            <KpiCardWithDelta
              title="Recovery Rate"
              metric={{ value: data.recoveryRate, prev: 0, pctChange: 0 }}
              format={(v) => `${v}%`}
            />
            <KpiCardWithDelta
              title="Revenue Recovered"
              metric={{ value: data.revenueRecovered, prev: 0, pctChange: 0 }}
              format={(v) => `LKR ${Number(v).toLocaleString()}`}
            />
            <KpiCardWithDelta
              title="Avg Return Time"
              metric={{ value: data.avgTimeUntilReturnMs ?? 0, prev: 0, pctChange: 0 }}
              format={(v) => (v ? formatDuration(Number(v)) : '—')}
            />
          </div>

          <div className="mx-auto flex max-w-md flex-col items-center gap-2">
            <Step label="Checkout Started" value={data.funnel.checkoutStarted} />
            <ArrowDown className="text-muted-foreground h-4 w-4" />
            <Step label="Shipping Page" value={data.funnel.shippingReached} />
            <ArrowDown className="text-muted-foreground h-4 w-4" />
            <Step label="Payment Page" value={data.funnel.paymentReached} />
            <ArrowDown className="text-muted-foreground h-4 w-4" />
            <Step label="Review" value={data.funnel.reviewReached} />
            <ArrowDown className="text-muted-foreground h-4 w-4" />
            <Step label="Abandoned" value={data.funnel.abandoned} />
            <ArrowDown className="text-muted-foreground h-4 w-4" />
            <Step label="Paid" value={data.funnel.paid} highlight />
          </div>

          <AnalyticsChartCard title="Exit Step Distribution">
            <DataTable
              data={data.exitSteps}
              getRowId={(r) => r.step}
              columns={[
                { id: 'step', header: 'Left After', cell: (row) => row.step },
                { id: 'count', header: 'Customers', cell: (row) => row.count },
              ]}
            />
          </AnalyticsChartCard>
        </div>
      )}
    </PageMotion>
  );
}

function Step({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
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
