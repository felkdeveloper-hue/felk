import { EventModel } from '@/models/analytics/index.js';
import type { AnalyticsFilter } from '@/schemas/analytics/index.js';
import { buildEventMatch, mergeMatch } from './analytics-query.builder.js';

function normalizeQuery(q: unknown): string {
  return String(q ?? '')
    .trim()
    .toLowerCase()
    .slice(0, 200);
}

export async function getSearchAnalytics(filter: AnalyticsFilter) {
  const base = await buildEventMatch(filter);
  delete base['name'];

  const searches = await EventModel.find(
    mergeMatch(base, { name: { $in: ['search', 'search_zero_results'] } }),
  )
    .select('name sessionId properties.query properties.resultCount occurredAt')
    .lean();

  const clicks = await EventModel.find(
    mergeMatch(base, {
      name: { $in: ['search_result_clicked', 'search_suggestion_clicked'] },
    }),
  )
    .select('name sessionId properties.query')
    .lean();

  const carts = await EventModel.find(mergeMatch(base, { name: 'add_to_cart' }))
    .select('sessionId')
    .lean();

  const payments = await EventModel.find(mergeMatch(base, { name: 'payment_completed' }))
    .select('sessionId')
    .lean();

  const cartSessions = new Set(carts.map((c) => c.sessionId).filter(Boolean) as string[]);
  const paidSessions = new Set(payments.map((p) => p.sessionId).filter(Boolean) as string[]);

  type Agg = {
    query: string;
    searches: number;
    zeroResults: number;
    resultClicks: number;
    suggestionClicks: number;
    sessions: Set<string>;
    cartSessions: Set<string>;
    purchaseSessions: Set<string>;
  };

  const byQuery = new Map<string, Agg>();

  for (const e of searches) {
    const q = normalizeQuery(e.properties?.query);
    if (!q) continue;
    const row = byQuery.get(q) ?? {
      query: q,
      searches: 0,
      zeroResults: 0,
      resultClicks: 0,
      suggestionClicks: 0,
      sessions: new Set<string>(),
      cartSessions: new Set<string>(),
      purchaseSessions: new Set<string>(),
    };
    row.searches += 1;
    if (e.name === 'search_zero_results' || Number(e.properties?.resultCount ?? 1) === 0) {
      row.zeroResults += 1;
    }
    if (e.sessionId) {
      row.sessions.add(e.sessionId);
      if (cartSessions.has(e.sessionId)) row.cartSessions.add(e.sessionId);
      if (paidSessions.has(e.sessionId)) row.purchaseSessions.add(e.sessionId);
    }
    byQuery.set(q, row);
  }

  for (const e of clicks) {
    const q = normalizeQuery(e.properties?.query);
    if (!q) continue;
    const row = byQuery.get(q);
    if (!row) continue;
    if (e.name === 'search_suggestion_clicked') row.suggestionClicks += 1;
    else row.resultClicks += 1;
  }

  const keywords = [...byQuery.values()]
    .map((r) => {
      const ctr =
        r.searches > 0
          ? Math.round(((r.resultClicks + r.suggestionClicks) / r.searches) * 1000) / 10
          : 0;
      const abandonRate =
        r.sessions.size > 0
          ? Math.round(((r.sessions.size - r.cartSessions.size) / r.sessions.size) * 1000) / 10
          : 0;
      return {
        query: r.query,
        searches: r.searches,
        zeroResults: r.zeroResults,
        resultClicks: r.resultClicks,
        suggestionClicks: r.suggestionClicks,
        cart: r.cartSessions.size,
        purchased: r.purchaseSessions.size,
        ctr,
        abandonRate,
      };
    })
    .sort((a, b) => b.searches - a.searches)
    .slice(0, 50);

  const zeroResultSearches = keywords
    .filter((k) => k.zeroResults > 0)
    .map((k) => ({ query: k.query, count: k.zeroResults }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 30);

  return {
    keywords,
    zeroResultSearches,
    totals: {
      searches: searches.filter((s) => s.name === 'search' || s.name === 'search_zero_results')
        .length,
      zeroResults: searches.filter(
        (s) => s.name === 'search_zero_results' || Number(s.properties?.resultCount ?? 1) === 0,
      ).length,
      suggestionClicks: clicks.filter((c) => c.name === 'search_suggestion_clicked').length,
      resultClicks: clicks.filter((c) => c.name === 'search_result_clicked').length,
    },
  };
}
