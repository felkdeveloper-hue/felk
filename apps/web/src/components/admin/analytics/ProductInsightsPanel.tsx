import { useProductInsights } from '@/hooks/admin';
import { formatDuration } from '@/components/admin/analytics';

export function ProductInsightsPanel({ productId }: { productId: string }) {
  const query = useProductInsights(productId, { period: '30d' });
  const data = query.data;

  if (query.isLoading) {
    return (
      <div className="mb-6 rounded-xl border p-4 text-sm text-[var(--admin-ink-muted)]">
        Loading product insights…
      </div>
    );
  }

  if (!data) return null;

  const metrics = [
    { label: 'Views', value: data.views },
    { label: 'Unique Visitors', value: data.uniqueVisitors },
    { label: 'Wishlist', value: data.wishlistAdds },
    { label: 'Cart Adds', value: data.cartAdds },
    { label: 'Purchases', value: data.purchases },
    { label: 'Conversion', value: `${data.conversionRate}%` },
    { label: 'Revenue', value: `LKR ${data.revenue.toLocaleString()}` },
    { label: 'Repeat Buyers', value: data.repeatBuyers },
    { label: 'Avg View Time', value: formatDuration(data.avgTimeViewingMs) },
    { label: 'Avg Scroll', value: `${data.avgScrollDepth}%` },
  ];

  return (
    <div className="mb-6 rounded-xl border p-4">
      <h2 className="mb-3 text-sm font-semibold text-[var(--admin-ink)]">Product Insights (30d)</h2>
      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-lg border px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--admin-ink-muted)]">
              {m.label}
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-[var(--admin-ink)]">
              {m.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
