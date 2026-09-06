import { SessionModel } from '@/models/analytics/index.js';
import { OrderModel } from '@/models/order.models.js';
import { PaymentModel } from '@/models/payment.models.js';
import { ORDER_STATUS } from '@/constants/order-status.js';
import type { AnalyticsFilter } from '@/schemas/analytics/index.js';
import { orderReceivedAt, paymentReceivedAt } from '@/utils/order-received-at.js';
import { buildOrderMatch, resolveDateRange } from './analytics-query.builder.js';
import {
  calendarDateInTz,
  startOfAnalyticsDay,
  startOfAnalyticsMonth,
  startOfAnalyticsYear,
} from './date-range.util.js';
import { pickSizeLabel, sizeNameByVariantId, toSizeCounts } from './size-breakdown.util.js';

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

function sumOrders(orders: Array<{ totals?: { grandTotal?: number } }>) {
  return orders.reduce((s, o) => s + Number(o.totals?.grandTotal ?? 0), 0);
}

function inRange(at: Date | undefined, from: Date, to: Date) {
  if (!at) return false;
  const time = at.getTime();
  return time >= from.getTime() && time <= to.getTime();
}

function soldProductsFromOrders(
  orders: LeanOrder[],
  sizeByVariant: Map<string, string>,
) {
  const productMap = new Map<
    string,
    {
      productId: string;
      productName: string;
      revenue: number;
      qty: number;
      sizes: Map<string, number>;
    }
  >();
  for (const order of orders) {
    for (const item of order.items ?? []) {
      const productId = String(item.productId ?? '');
      if (!productId) continue;
      const name = String(item.name ?? item.productName ?? productId);
      const qty = Number(item.quantity ?? 1);
      const lineTotal = Number(item.lineTotal ?? item.unitPrice ?? item.price ?? 0);
      const size = pickSizeLabel({
        sizeName: item.sizeName ? String(item.sizeName) : '',
        variantId: item.variantId ? String(item.variantId) : '',
        variantTitle: item.variantTitle ? String(item.variantTitle) : '',
        sizeByVariant,
      });
      const current = productMap.get(productId) ?? {
        productId,
        productName: name,
        revenue: 0,
        qty: 0,
        sizes: new Map<string, number>(),
      };
      current.revenue += Number.isFinite(lineTotal) && lineTotal > 0 ? lineTotal : 0;
      current.qty += qty;
      current.sizes.set(size, (current.sizes.get(size) ?? 0) + qty);
      productMap.set(productId, current);
    }
  }
  return [...productMap.values()]
    .map((product) => ({
      productId: product.productId,
      productName: product.productName,
      revenue: Math.round(product.revenue * 100) / 100,
      qty: product.qty,
      sizes: toSizeCounts(product.sizes),
    }))
    .sort((a, b) => b.qty - a.qty || b.revenue - a.revenue);
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
  // Always Asia/Colombo — production hosts run UTC, which used to dump
  // late-night Sri Lanka orders (after 00:00 SL / before 00:00 UTC) into Yesterday.
  const todayStart = startOfAnalyticsDay(now);
  const yesterday = resolveDateRange({ period: 'yesterday' });
  const yesterdayStart = yesterday.from;
  const yesterdayEnd = yesterday.to;
  const weekStart = resolveDateRange({ period: '7d' }).from;
  const monthStart = startOfAnalyticsMonth(now);
  const yearStart = startOfAnalyticsYear(now);

  const range = resolveDateRange({ ...filter, period: filter.period ?? '30d' });
  const fetchFrom = new Date(Math.min(yearStart.getTime(), range.from.getTime()));
  const fetchMatch = await buildOrderMatch(filter, {
    defaultStatuses: PAID_STATUSES,
    range: { from: fetchFrom, to: now },
  });

  const allOrders = (await OrderModel.find(fetchMatch)
    .select('totals.grandTotal userId paymentId paidAt placedAt createdAt items')
    .lean()) as unknown as LeanOrder[];

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
    const day = calendarDateInTz(received);
    trendMap.set(day, (trendMap.get(day) ?? 0) + Number(o.totals?.grandTotal ?? 0));
  }
  const trend = [...trendMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, revenue]) => ({ date, revenue: Math.round(revenue * 100) / 100 }));

  const saleVariantIds = [
    ...new Set(
      allOrders.flatMap((order) =>
        (order.items ?? []).map((item) => String(item.variantId ?? '')).filter(Boolean),
      ),
    ),
  ];
  const sizeByVariant = await sizeNameByVariantId(saleVariantIds);
  const topProducts = soldProductsFromOrders(periodOrders, sizeByVariant);
  const yearProducts = soldProductsFromOrders(yearOrders, sizeByVariant);

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
    yearProducts,
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
