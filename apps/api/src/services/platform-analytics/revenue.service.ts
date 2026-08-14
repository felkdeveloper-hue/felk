import { SessionModel } from '@/models/analytics/index.js';
import { OrderModel } from '@/models/order.models.js';
import { PaymentModel } from '@/models/payment.models.js';
import { ORDER_STATUS } from '@/constants/order-status.js';
import type { AnalyticsFilter } from '@/schemas/analytics/index.js';
import { orderReceivedAt, paymentReceivedAt } from '@/utils/order-received-at.js';
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

type LeanOrder = {
  paymentId?: unknown;
  userId?: unknown;
  paidAt?: Date | null;
  placedAt?: Date;
  createdAt?: Date;
  totals?: { grandTotal?: number };
  items?: Array<Record<string, unknown>>;
};

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function sumOrders(orders: Array<{ totals?: { grandTotal?: number } }>) {
  return orders.reduce((s, o) => s + Number(o.totals?.grandTotal ?? 0), 0);
}

function inRange(at: Date | undefined, from: Date, to: Date) {
  if (!at) return false;
  const time = at.getTime();
  return time >= from.getTime() && time <= to.getTime();
}

async function receivedAtByPaymentId(orders: LeanOrder[]): Promise<Map<string, Date | undefined>> {
  const ids = [
    ...new Set(
      orders.map((order) => (order.paymentId ? String(order.paymentId) : '')).filter(Boolean),
    ),
  ];
  const payments =
    ids.length > 0
      ? await PaymentModel.find({ _id: { $in: ids } })
          .select('paidAt createdAt gatewayPaymentId metadata referenceNumber')
          .lean()
      : [];
  const paymentsById = new Map(payments.map((payment) => [String(payment._id), payment]));
  const received = new Map<string, Date | undefined>();
  for (const order of orders) {
    const paymentId = order.paymentId ? String(order.paymentId) : '';
    received.set(
      paymentId,
      paymentReceivedAt(paymentsById.get(paymentId) ?? {}) ?? orderReceivedAt(order),
    );
  }
  return received;
}

export async function getRevenueDashboard(filter: AnalyticsFilter) {
  const now = new Date();
  const todayStart = startOfDay(now);
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const yesterdayEnd = new Date(todayStart.getTime() - 1);
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 6);
  const monthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);
  const yearStart = new Date(todayStart.getFullYear(), 0, 1);

  const range = resolveDateRange({ ...filter, period: filter.period ?? '30d' });
  const fetchFrom = new Date(Math.min(yearStart.getTime(), range.from.getTime()));
  const fetchMatch = await buildOrderMatch(filter, {
    defaultStatuses: PAID_STATUSES,
    range: { from: fetchFrom, to: now },
  });

  const allOrders = (await OrderModel.find(fetchMatch)
    .select('totals.grandTotal userId paymentId paidAt placedAt createdAt items')
    .lean()) as LeanOrder[];

  const receivedByPayment = await receivedAtByPaymentId(allOrders);
  const receivedOf = (order: LeanOrder) =>
    receivedByPayment.get(order.paymentId ? String(order.paymentId) : '');

  const todayOrders = allOrders.filter((order) => inRange(receivedOf(order), todayStart, now));
  const yesterdayOrders = allOrders.filter((order) =>
    inRange(receivedOf(order), yesterdayStart, yesterdayEnd),
  );
  const weekOrders = allOrders.filter((order) => inRange(receivedOf(order), weekStart, now));
  const monthOrders = allOrders.filter((order) => inRange(receivedOf(order), monthStart, now));
  const yearOrders = allOrders.filter((order) => inRange(receivedOf(order), yearStart, now));
  const periodOrders = allOrders.filter((order) =>
    inRange(receivedOf(order), range.from, range.to),
  );

  const periodRevenue = sumOrders(periodOrders);
  const aov =
    periodOrders.length > 0 ? Math.round((periodRevenue / periodOrders.length) * 100) / 100 : 0;

  const trendMap = new Map<string, number>();
  for (const o of periodOrders) {
    const received = receivedOf(o);
    if (!received) continue;
    const day = startOfDay(received).toISOString().slice(0, 10);
    trendMap.set(day, (trendMap.get(day) ?? 0) + Number(o.totals?.grandTotal ?? 0));
  }
  const trend = [...trendMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, revenue]) => ({ date, revenue: Math.round(revenue * 100) / 100 }));

  const productMap = new Map<
    string,
    { productId: string; productName: string; revenue: number; qty: number }
  >();
  for (const o of periodOrders) {
    for (const item of o.items ?? []) {
      const pid = String(item.productId ?? '');
      if (!pid) continue;
      const name = String(item.name ?? item.productName ?? pid);
      const qty = Number(item.quantity ?? 1);
      const lineTotal = Number(item.lineTotal ?? item.unitPrice ?? item.price ?? 0);
      const cur = productMap.get(pid) ?? { productId: pid, productName: name, revenue: 0, qty: 0 };
      cur.revenue += Number.isFinite(lineTotal) && lineTotal > 0 ? lineTotal : 0;
      cur.qty += qty;
      productMap.set(pid, cur);
    }
  }
  const topProducts = [...productMap.values()]
    .map((p) => ({ ...p, revenue: Math.round(p.revenue * 100) / 100 }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 15);

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
  }

  const bySource = new Map<string, { visitors: Set<string>; orders: number; revenue: number }>();
  const byDevice = new Map<string, { orders: number; revenue: number }>();
  const byCountry = new Map<string, { orders: number; revenue: number }>();

  for (const o of periodOrders) {
    const uid = o.userId ? String(o.userId) : null;
    const placed = (receivedOf(o) ?? new Date(0)).getTime();
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
    todayOrders: todayOrders.length,
    yesterdayOrders: yesterdayOrders.length,
    weekOrders: weekOrders.length,
    monthOrders: monthOrders.length,
    yearOrders: yearOrders.length,
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
