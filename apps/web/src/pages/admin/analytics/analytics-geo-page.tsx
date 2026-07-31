import { MapPin, Globe } from 'lucide-react';
import { AdminErrorState, AdminPageHeader, PageMotion } from '@/components/admin';
import {
  AnalyticsFilterBar,
  AnalyticsBreadcrumbs,
  AnalyticsChartCard,
  AnalyticsEmpty,
  ChartSkeleton,
  Drillable,
  AnalyticsExportButton,
} from '@/components/admin/analytics';
import { useGeoBreakdown, useAnalyticsFilters, useAnalyticsDrillDown } from '@/hooks/admin';

function FlagEmoji({ code }: { code: string | null }) {
  if (!code) return null;
  const codePoints = code
    .toUpperCase()
    .split('')
    .map((c) => 127397 + c.charCodeAt(0));
  return <span>{String.fromCodePoint(...codePoints)}</span>;
}

export function AnalyticsGeoPage() {
  const { filter, setFilter, clearFilters } = useAnalyticsFilters({ defaults: { period: '7d' } });
  const { drill, breadcrumbs, trail } = useAnalyticsDrillDown(filter);
  const query = useGeoBreakdown(filter);
  const data = query.data;

  return (
    <PageMotion>
      <AdminPageHeader
        title="Geography"
        description="Visitor distribution by country and city."
        actions={
          <AnalyticsExportButton
            reportType="geo"
            filter={filter}
            drillLabel={trail.at(-1)?.label}
          />
        }
      />

      <AnalyticsBreadcrumbs items={breadcrumbs} />
      <AnalyticsFilterBar filter={filter} onChange={setFilter} onClear={clearFilters} />

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
                {data.countries.map((c) => {
                  const code = c.countryCode ?? undefined;
                  const label = c.country ?? c.countryCode ?? 'Unknown';
                  return (
                    <Drillable
                      key={c.countryCode ?? c.country ?? 'unknown'}
                      as="div"
                      className="flex items-center gap-3 rounded-md px-1 py-1.5"
                      onDrill={() =>
                        drill({
                          destination: 'visitors',
                          label: `Visitors · ${label}`,
                          append: { country: code },
                        })
                      }
                    >
                      <FlagEmoji code={c.countryCode} />
                      <span className="flex-1 text-sm">{label}</span>
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
                    </Drillable>
                  );
                })}
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
                  <Drillable
                    key={`${c.city}-${c.countryCode}-${i}`}
                    as="div"
                    className="flex items-center gap-3 rounded-md px-1 py-1.5"
                    onDrill={() =>
                      drill({
                        destination: 'visitors',
                        label: `Visitors · ${c.city ?? 'City'}`,
                        append: {
                          city: c.city ?? undefined,
                          country: c.countryCode ?? undefined,
                        },
                      })
                    }
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
                  </Drillable>
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
