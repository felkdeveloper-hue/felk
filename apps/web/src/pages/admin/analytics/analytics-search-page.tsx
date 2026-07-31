import { useMemo } from 'react';
import { AdminErrorState, AdminPageHeader, PageMotion, DataTable } from '@/components/admin';
import {
  AnalyticsFilterBar,
  AnalyticsBreadcrumbs,
  AnalyticsEmpty,
  TableSkeleton,
  AnalyticsChartCard,
  KpiCardWithDelta,
  Drillable,
  AnalyticsExportButton,
} from '@/components/admin/analytics';
import { useSearchAnalytics, useAnalyticsFilters, useAnalyticsDrillDown } from '@/hooks/admin';
import type { SearchKeywordRow } from '@/services/sdk/admin';
import type { DataTableColumn } from '@/components/admin';
import { DRILL_TOOLTIP } from '@/lib/analytics/drill-down';

export function AnalyticsSearchPage() {
  const { filter, setFilter, clearFilters } = useAnalyticsFilters({ defaults: { period: '7d' } });
  const { drill, breadcrumbs, trail } = useAnalyticsDrillDown(filter);
  const query = useSearchAnalytics(filter);
  const data = query.data;

  const columns: DataTableColumn<SearchKeywordRow>[] = useMemo(
    () => [
      {
        id: 'query',
        header: 'Keyword',
        cell: (row) => (
          <Drillable
            as="div"
            label={`${row.query}: ${DRILL_TOOLTIP}`}
            onDrill={() =>
              drill({
                destination: 'sessions',
                label: `Sessions · “${row.query}”`,
                append: { q: row.query },
              })
            }
            className="text-primary font-medium underline-offset-2 hover:underline"
          >
            {row.query}
          </Drillable>
        ),
      },
      {
        id: 'searches',
        header: 'Searches',
        cell: (row) => (
          <Drillable
            as="div"
            onDrill={() =>
              drill({
                destination: 'events',
                label: `Search events · ${row.query}`,
                append: { eventName: 'search', q: row.query },
              })
            }
          >
            {row.searches}
          </Drillable>
        ),
      },
      { id: 'purchased', header: 'Purchased', cell: (row) => row.purchased },
      {
        id: 'cart',
        header: 'Cart',
        cell: (row) => (
          <Drillable
            as="div"
            onDrill={() =>
              drill({
                destination: 'cart',
                label: `Cart · ${row.query}`,
                append: { q: row.query },
              })
            }
          >
            {row.cart}
          </Drillable>
        ),
      },
      { id: 'ctr', header: 'CTR', cell: (row) => `${row.ctr}%` },
      { id: 'abandonRate', header: 'Abandon %', cell: (row) => `${row.abandonRate}%` },
      { id: 'zeroResults', header: 'Zero results', cell: (row) => row.zeroResults },
    ],
    [drill],
  );

  return (
    <PageMotion>
      <AdminPageHeader
        title="Search Analytics"
        description="Most searched keywords, zero-result searches, and search-to-purchase conversion."
        actions={
          <AnalyticsExportButton
            reportType="search"
            filter={filter}
            drillLabel={trail.at(-1)?.label}
          />
        }
      />
      <AnalyticsBreadcrumbs items={breadcrumbs} />
      <AnalyticsFilterBar filter={filter} onChange={setFilter} onClear={clearFilters} />

      {query.isError ? (
        <AdminErrorState
          message="Failed to load search analytics."
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
              title="Searches"
              metric={{ value: data.totals.searches, prev: 0, pctChange: 0 }}
              onDrill={() =>
                drill({
                  destination: 'events',
                  label: 'Search events',
                  append: { eventName: 'search' },
                })
              }
            />
            <KpiCardWithDelta
              title="Zero Results"
              metric={{ value: data.totals.zeroResults, prev: 0, pctChange: 0 }}
              onDrill={() =>
                drill({
                  destination: 'events',
                  label: 'Zero-result searches',
                  append: { eventName: 'search_zero_results' },
                })
              }
            />
            <KpiCardWithDelta
              title="Result Clicks"
              metric={{ value: data.totals.resultClicks, prev: 0, pctChange: 0 }}
              onDrill={() =>
                drill({
                  destination: 'events',
                  label: 'Result clicks',
                  append: { eventName: 'search_result_clicked' },
                })
              }
            />
            <KpiCardWithDelta
              title="Suggestion Clicks"
              metric={{ value: data.totals.suggestionClicks, prev: 0, pctChange: 0 }}
              onDrill={() =>
                drill({
                  destination: 'events',
                  label: 'Suggestion clicks',
                  append: { eventName: 'search_suggestion_clicked' },
                })
              }
            />
          </div>

          <AnalyticsChartCard title="Most Searched Keywords">
            <DataTable data={data.keywords} getRowId={(r) => r.query} columns={columns} />
          </AnalyticsChartCard>

          <AnalyticsChartCard title="Searches With Zero Results">
            <DataTable
              data={data.zeroResultSearches}
              getRowId={(r) => r.query}
              columns={[
                {
                  id: 'query',
                  header: 'Keyword',
                  cell: (row) => (
                    <Drillable
                      as="div"
                      onDrill={() =>
                        drill({
                          destination: 'sessions',
                          label: `Zero results · ${row.query}`,
                          append: { q: row.query },
                        })
                      }
                      className="text-primary font-medium underline-offset-2 hover:underline"
                    >
                      {row.query}
                    </Drillable>
                  ),
                },
                { id: 'count', header: 'Count', cell: (row) => row.count },
              ]}
            />
          </AnalyticsChartCard>
        </div>
      )}
    </PageMotion>
  );
}
