import { useState } from 'react';
import { MapPin, Globe } from 'lucide-react';
import { AdminErrorState, AdminPageHeader, PageMotion } from '@/components/admin';
import {
  AnalyticsFilterBar,
  AnalyticsChartCard,
  AnalyticsEmpty,
  ChartSkeleton,
} from '@/components/admin/analytics';
import { useGeoBreakdown } from '@/hooks/admin';
import type { AnalyticsFilter } from '@/services/sdk/admin';

function FlagEmoji({ code }: { code: string | null }) {
  if (!code) return null;
  const codePoints = code
    .toUpperCase()
    .split('')
    .map((c) => 127397 + c.charCodeAt(0));
  return <span>{String.fromCodePoint(...codePoints)}</span>;
}

export function AnalyticsGeoPage() {
  const [filter, setFilter] = useState<AnalyticsFilter>({ period: '7d' });
  const query = useGeoBreakdown(filter);
  const data = query.data;

  return (
    <PageMotion>
      <AdminPageHeader title="Geography" description="Visitor distribution by country and city." />

      <AnalyticsFilterBar filter={filter} onChange={(f) => setFilter((p) => ({ ...p, ...f }))} />

      {query.isError ? (
        <AdminErrorState message="Failed to load geo data." onRetry={() => query.refetch()} />
      ) : query.isLoading ? (
        <div className="mt-4 grid gap-5 lg:grid-cols-2">
          <ChartSkeleton height={400} />
          <ChartSkeleton height={400} />
        </div>
      ) : !data ? null : (
        <div className="mt-4 grid gap-5 lg:grid-cols-2">
          {/* Countries */}
          <AnalyticsChartCard
            title="Top countries"
            description={`${data.countries.length} countries`}
          >
            {!data.countries.length ? (
              <AnalyticsEmpty message="No geographic data yet." />
            ) : (
              <div className="space-y-1">
                {data.countries.map((c) => (
                  <div
                    key={c.countryCode ?? c.country ?? 'unknown'}
                    className="flex items-center gap-3 py-1.5"
                  >
                    <FlagEmoji code={c.countryCode} />
                    <span className="flex-1 text-sm">
                      {c.country ?? c.countryCode ?? 'Unknown'}
                    </span>
                    <div className="flex items-center gap-3">
                      <div className="bg-muted h-1.5 w-24 overflow-hidden rounded-full">
                        <div
                          className="bg-primary h-full rounded-full"
                          style={{ width: `${c.pct}%` }}
                        />
                      </div>
                      <span className="text-muted-foreground w-8 text-right text-xs tabular-nums">
                        {c.pct}%
                      </span>
                      <span className="w-12 text-right text-sm tabular-nums">
                        {c.count.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </AnalyticsChartCard>

          {/* Cities */}
          <AnalyticsChartCard title="Top cities" description={`${data.cities.length} cities`}>
            {!data.cities.length ? (
              <AnalyticsEmpty message="No city data available." />
            ) : (
              <div className="space-y-1">
                {data.cities.map((c, i) => (
                  <div
                    key={`${c.city}-${c.countryCode}-${i}`}
                    className="flex items-center gap-3 py-1.5"
                  >
                    <MapPin className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                    <span className="flex-1 text-sm">
                      {c.city ?? '—'}
                      {c.countryCode && (
                        <span className="text-muted-foreground ml-1 text-xs">
                          ({c.countryCode})
                        </span>
                      )}
                    </span>
                    <span className="text-sm tabular-nums">{c.count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </AnalyticsChartCard>
        </div>
      )}

      {data && data.countries.length > 0 && (
        <div className="bg-card border-border mt-5 overflow-hidden rounded-xl border">
          <div className="flex items-center gap-2 border-b border-inherit px-4 py-3">
            <Globe className="text-muted-foreground h-4 w-4" />
            <span className="text-sm font-medium">All countries</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-inherit">
                <th className="text-muted-foreground px-4 py-2.5 text-left text-xs font-medium">
                  Country
                </th>
                <th className="text-muted-foreground px-4 py-2.5 text-right text-xs font-medium">
                  Visitors
                </th>
                <th className="text-muted-foreground px-4 py-2.5 text-right text-xs font-medium">
                  Share
                </th>
              </tr>
            </thead>
            <tbody>
              {data.countries.map((c) => (
                <tr
                  key={c.countryCode ?? c.country}
                  className="border-b border-inherit last:border-0"
                >
                  <td className="flex items-center gap-2 px-4 py-2.5">
                    <FlagEmoji code={c.countryCode} />
                    {c.country ?? c.countryCode ?? 'Unknown'}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {c.count.toLocaleString()}
                  </td>
                  <td className="text-muted-foreground px-4 py-2.5 text-right tabular-nums">
                    {c.pct}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageMotion>
  );
}
