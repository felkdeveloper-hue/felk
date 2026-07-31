import { SessionModel } from '@/models/analytics/index.js';
import { OrderModel } from '@/models/order.models.js';
import { ORDER_STATUS } from '@/constants/order-status.js';
import type { AnalyticsFilter } from '@/schemas/analytics/index.js';
import { buildOrderMatch, resolveDateRange } from './analytics-query.builder.js';

const PAID_STATUSES = [
  ORDER_STATUS.PENDING,
  ORDER_STATUS.CONFIRMED,
  ORDER_STATUS.PACKED,
  ORDER_STATUS.READY_FOR_SHIPMENT,
  ORDER_STATUS.SHIPPED,
  ORDER_STATUS.DELIVERED,
  ORDER_STATUS.COMPLETED,
];

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function sumOrders(orders: Array<{ totals?: { grandTotal?: number } }>) {
  return orders.reduce((s, o) => s + Number(o.totals?.grandTotal ?? 0), 0);
}

export async function getRevenueDashboard(filter: AnalyticsFilter) {
  const now = new Date();
  const todayStart = startOfDay(now);
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 6);
  const monthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);
  const yearStart = new Date(todayStart.getFullYear(), 0, 1);

  const mkRange = (from: Date, to: Date) => ({ from, to });
  const opts = { defaultStatuses: PAID_STATUSES };

  const [todayMatch, yesterdayMatch, weekMatch, monthMatch, yearMatch, periodMatch] =
    await Promise.all([
      buildOrderMatch(filter, { ...opts, range: mkRange(todayStart, now) }),
      buildOrderMatch(filter, {
        ...opts,
        range: mkRange(yesterdayStart, new Date(todayStart.getTime() - 1)),
      }),
      buildOrderMatch(filter, { ...opts, range: mkRange(weekStart, now) }),
      buildOrderMatch(filter, { ...opts, range: mkRange(monthStart, now) }),
      buildOrderMatch(filter, { ...opts, range: mkRange(yearStart, now) }),
      buildOrderMatch({ ...filter, period: filter.period ?? '30d' }, opts),
    ]);

  const range = resolveDateRange({ ...filter, period: filter.period ?? '30d' });

  const [todayOrders, yesterdayOrders, weekOrders, monthOrders, yearOrders, periodOrders] =
    await Promise.all([
      OrderModel.find(todayMatch).select('totals.grandTotal userId placedAt items').lean(),
      OrderModel.find(yesterdayMatch).select('totals.grandTotal').lean(),
      OrderModel.find(weekMatch).select('totals.grandTotal userId placedAt items').lean(),
      OrderModel.find(monthMatch).select('totals.grandTotal userId placedAt items').lean(),
      OrderModel.find(yearMatch).select('totals.grandTotal userId placedAt items').lean(),
      OrderModel.find(periodMatch).select('totals.grandTotal userId placedAt items').lean(),
    ]);

  const periodRevenue = sumOrders(periodOrders);
  const aov =
    periodOrders.length > 0 ? Math.round((periodRevenue / periodOrders.length) * 100) / 100 : 0;

  // Trend by day
  const trendMap = new Map<string, number>();
  for (const o of periodOrders) {
    const day = startOfDay(new Date(o.placedAt)).toISOString().slice(0, 10);
    trendMap.set(day, (trendMap.get(day) ?? 0) + Number(o.totals?.grandTotal ?? 0));
  }
  const trend = [...trendMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, revenue]) => ({ date, revenue: Math.round(revenue * 100) / 100 }));

  // Top products
  const productMap = new Map<
    string,
    { productId: string; productName: string; revenue: number; qty: number }
  >();
  for (const o of periodOrders) {
    for (const item of o.items ?? []) {
      const pid = String((item as { productId?: unknown }).productId ?? '');
      if (!pid) continue;
      const name = String(
        (item as { name?: string; productName?: string }).name ??
          (item as { productName?: string }).productName ??
          pid,
      );
      const qty = Number((item as { quantity?: number }).quantity ?? 1);
      const price = Number((item as { unitPrice?: number }).unitPrice ?? 0);
      const cur = productMap.get(pid) ?? { productId: pid, productName: name, revenue: 0, qty: 0 };
      cur.revenue += qty * price;
      cur.qty += qty;
      productMap.set(pid, cur);
    }
  }
  const topProducts = [...productMap.values()]
    .map((p) => ({ ...p, revenue: Math.round(p.revenue * 100) / 100 }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 15);

  // Attribution via last session before order for each user
  const userIds = [
    ...new Set(periodOrders.map((o) => (o.userId ? String(o.userId) : null)).filter(Boolean)),
  ] as string[];

  const sessions =
    userIds.length > 0
      ? await SessionModel.find({
          userId: { $in: userIds },
          startedAt: {
            $gte: new Date(range.from.getTime() - 7 * 24 * 60 * 60 * 1000),
            $lte: range.to,
          },
        })
          .select('userId startedAt trafficSource deviceType country')
          .sort({ startedAt: -1 })
          .lean()
      : [];

  const lastSessionByUser = new Map<string, (typeof sessions)[0]>();
  for (const s of sessions) {
    const uid = s.userId ? String(s.userId) : '';
    if (!uid || lastSessionByUser.has(uid)) continue;
    // We'll refine per-order below
  }

  const bySource = new Map<string, { visitors: Set<string>; orders: number; revenue: number }>();
  const byDevice = new Map<string, { orders: number; revenue: number }>();
  const byCountry = new Map<string, { orders: number; revenue: number }>();

  for (const o of periodOrders) {
    const uid = o.userId ? String(o.userId) : null;
    const placed = new Date(o.placedAt).getTime();
    let touch = uid
      ? sessions.find((s) => String(s.userId) === uid && new Date(s.startedAt).getTime() <= placed)
      : undefined;
    if (!touch && uid) {
      touch = sessions.find((s) => String(s.userId) === uid);
    }
    const source = touch?.trafficSource ?? 'direct';
    const device = touch?.deviceType ?? 'unknown';
    const country = touch?.country ?? 'Unknown';
    const rev = Number(o.totals?.grandTotal ?? 0);

    const src = bySource.get(source) ?? { visitors: new Set<string>(), orders: 0, revenue: 0 };
    if (uid) src.visitors.add(uid);
    src.orders += 1;
    src.revenue += rev;
    bySource.set(source, src);

    const dev = byDevice.get(device) ?? { orders: 0, revenue: 0 };
    dev.orders += 1;
    dev.revenue += rev;
    byDevice.set(device, dev);

    const ctry = byCountry.get(country) ?? { orders: 0, revenue: 0 };
    ctry.orders += 1;
    ctry.revenue += rev;
    byCountry.set(country, ctry);

    void lastSessionByUser;
  }

  return {
    today: Math.round(sumOrders(todayOrders) * 100) / 100,
    yesterday: Math.round(sumOrders(yesterdayOrders) * 100) / 100,
    week: Math.round(sumOrders(weekOrders) * 100) / 100,
    month: Math.round(sumOrders(monthOrders) * 100) / 100,
    year: Math.round(sumOrders(yearOrders) * 100) / 100,
    periodRevenue: Math.round(periodRevenue * 100) / 100,
    aov,
    orderCount: periodOrders.length,
    trend,
    topProducts,
    byTrafficSource: [...bySource.entries()].map(([source, v]) => ({
      source,
      visitors: v.visitors.size,
      orders: v.orders,
      revenue: Math.round(v.revenue * 100) / 100,
      conversion: v.visitors.size > 0 ? Math.round((v.orders / v.visitors.size) * 1000) / 10 : 0,
    })),
    byDevice: [...byDevice.entries()].map(([device, v]) => ({
      device,
      orders: v.orders,
      revenue: Math.round(v.revenue * 100) / 100,
    })),
    byCountry: [...byCountry.entries()]
      .map(([country, v]) => ({
        country,
        orders: v.orders,
        revenue: Math.round(v.revenue * 100) / 100,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 20),
  };
}
