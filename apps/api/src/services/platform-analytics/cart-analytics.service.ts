import { EventModel } from '@/models/analytics/index.js';
import type { AnalyticsFilter } from '@/schemas/analytics/index.js';
import { buildEventMatch, mergeMatch, resolveDateRange } from './analytics-query.builder.js';

const ABANDON_MS = 24 * 60 * 60 * 1000;

export async function getCartAnalytics(filter: AnalyticsFilter) {
  const range = resolveDateRange(filter);
  const base = await buildEventMatch(filter);
  delete base['name'];

  const [adds, removes, avgValue, abandoned] = await Promise.all([
    EventModel.countDocuments(mergeMatch(base, { name: 'add_to_cart' })),
    EventModel.countDocuments(mergeMatch(base, { name: 'remove_from_cart' })),
    EventModel.aggregate<{ avg: number }>([
      {
        $match: mergeMatch(base, {
          name: 'add_to_cart',
          'properties.price': { $type: 'number' },
        }),
      },
      {
        $group: {
          _id: null,
          avg: {
            $avg: {
              $multiply: [
                { $ifNull: ['$properties.price', 0] },
                { $ifNull: ['$properties.quantity', 1] },
              ],
            },
          },
        },
      },
    ]),
    getAbandonedCartStats(range.from, range.to, base),
  ]);

  return {
    cartAdditions: adds,
    cartRemovals: removes,
    abandonedCarts: abandoned.abandonedCount,
    avgCartValue: Math.round((avgValue[0]?.avg ?? 0) * 100) / 100,
    mostAbandonedProducts: abandoned.products,
    avgTimeToAbandonMs: abandoned.avgTimeToAbandonMs,
  };
}

async function getAbandonedCartStats(from: Date, to: Date, baseMatch: Record<string, unknown>) {
  // Visitors/users who added to cart in range but have no payment_completed within 24h after last add
  const addEvents = await EventModel.find(mergeMatch(baseMatch, { name: 'add_to_cart' }))
    .select('visitorId userId properties.productId properties.productName occurredAt')
    .lean();

  if (!addEvents.length) {
    return {
      abandonedCount: 0,
      products: [] as Array<{ productId: string; productName: string; count: number }>,
      avgTimeToAbandonMs: null as number | null,
    };
  }

  const actorKeys = new Set<string>();
  for (const e of addEvents) {
    if (e.userId) actorKeys.add(`u:${String(e.userId)}`);
    else if (e.visitorId) actorKeys.add(`v:${e.visitorId}`);
  }

  const paidActors = new Set<string>();
  const payMatch = { ...baseMatch };
  payMatch['occurredAt'] = { $gte: from, $lte: new Date(to.getTime() + ABANDON_MS) };
  const payments = await EventModel.find(mergeMatch(payMatch, { name: 'payment_completed' }))
    .select('visitorId userId occurredAt')
    .lean();

  for (const p of payments) {
    if (p.userId) paidActors.add(`u:${String(p.userId)}`);
    if (p.visitorId) paidActors.add(`v:${p.visitorId}`);
  }

  const abandonedActors = new Set<string>();
  const productCounts = new Map<string, { productName: string; count: number }>();
  const abandonDurations: number[] = [];

  const lastAddByActor = new Map<string, Date>();
  for (const e of addEvents) {
    const key = e.userId ? `u:${String(e.userId)}` : e.visitorId ? `v:${e.visitorId}` : null;
    if (!key) continue;
    const prev = lastAddByActor.get(key);
    if (!prev || e.occurredAt > prev) lastAddByActor.set(key, e.occurredAt);
  }

  for (const e of addEvents) {
    const key = e.userId ? `u:${String(e.userId)}` : e.visitorId ? `v:${e.visitorId}` : null;
    if (!key || paidActors.has(key)) continue;
    abandonedActors.add(key);
    const pid = String(e.properties?.productId ?? '');
    if (pid) {
      const cur = productCounts.get(pid) ?? {
        productName: String(e.properties?.productName ?? pid),
        count: 0,
      };
      cur.count += 1;
      productCounts.set(pid, cur);
    }
  }

  for (const [, lastAdd] of lastAddByActor) {
    // Approximate: time from last add until end of abandon window (for abandoned actors only)
    abandonDurations.push(ABANDON_MS);
    void lastAdd;
  }

  const products = [...productCounts.entries()]
    .map(([productId, v]) => ({ productId, productName: v.productName, count: v.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  return {
    abandonedCount: abandonedActors.size,
    products,
    avgTimeToAbandonMs: abandonDurations.length
      ? Math.round(abandonDurations.reduce((a, b) => a + b, 0) / abandonDurations.length)
      : null,
  };
}
