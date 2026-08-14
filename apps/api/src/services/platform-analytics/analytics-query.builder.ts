import { Types, type FilterQuery } from 'mongoose';
import { ProductModel } from '@/models/product.models.js';
import { UserModel } from '@/models/user.model.js';
import type { AnalyticsFilter } from '@/schemas/analytics/index.js';
import { orderReceivedAtExpr } from '@/utils/order-received-at.js';
import { resolveDateRange, type DateRange } from './date-range.util.js';

export type MongoMatch = Record<string, unknown>;

function asObjectId(id?: string | null): Types.ObjectId | string | undefined {
  if (!id) return undefined;
  return Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : id;
}

/** Resolve product IDs from brandId (+ optional productId intersect). null = no product filter. */
export async function resolveProductIds(
  filter: Pick<AnalyticsFilter, 'brandId' | 'productId'>,
): Promise<string[] | null> {
  let ids: string[] | null = null;

  if (filter.brandId) {
    const brandOid = asObjectId(filter.brandId);
    const products = await ProductModel.find({
      brandId: brandOid,
      isDeleted: { $ne: true },
    })
      .select('_id')
      .lean();
    ids = products.map((p) => String(p._id));
  }

  if (filter.productId) {
    if (ids === null) return [filter.productId];
    return ids.includes(filter.productId) ? [filter.productId] : [];
  }

  return ids;
}

function applyProductPropertyFilter(match: MongoMatch, productIds: string[] | null) {
  if (productIds === null) return;
  if (productIds.length === 0) {
    match['properties.productId'] = { $in: [] };
    return;
  }
  match['properties.productId'] = productIds.length === 1 ? productIds[0] : { $in: productIds };
}

function applyCommonDims(
  match: MongoMatch,
  filter: AnalyticsFilter,
  keys: {
    device?: string;
    country?: string;
    browser?: string;
    userId?: string;
    sessionId?: string;
    trafficSource?: string;
  },
) {
  if (filter.device && keys.device) match[keys.device] = filter.device;
  if (filter.country && keys.country) match[keys.country] = filter.country;
  if (filter.browser && keys.browser) {
    match[keys.browser] = { $regex: filter.browser, $options: 'i' };
  }
  if (filter.userId && keys.userId) match[keys.userId] = asObjectId(filter.userId);
  if (filter.sessionId && keys.sessionId) match[keys.sessionId] = filter.sessionId;
  if (filter.trafficSource && keys.trafficSource) {
    match[keys.trafficSource] = filter.trafficSource;
  }
}

export function buildSessionMatch(filter: AnalyticsFilter, range?: DateRange): MongoMatch {
  const r = range ?? resolveDateRange(filter);
  const match: MongoMatch = { startedAt: { $gte: r.from, $lte: r.to } };
  applyCommonDims(match, filter, {
    device: 'deviceType',
    country: 'country',
    browser: 'browser',
    userId: 'userId',
    sessionId: 'sessionId',
    trafficSource: 'trafficSource',
  });
  // city is not stored on sessions
  if (filter.q) {
    match['$or'] = [
      { sessionId: { $regex: filter.q, $options: 'i' } },
      { visitorId: { $regex: filter.q, $options: 'i' } },
      { entryPage: { $regex: filter.q, $options: 'i' } },
      { exitPage: { $regex: filter.q, $options: 'i' } },
    ];
  }
  return match;
}

export async function buildEventMatch(
  filter: AnalyticsFilter,
  range?: DateRange,
): Promise<MongoMatch> {
  const r = range ?? resolveDateRange(filter);
  const match: MongoMatch = { occurredAt: { $gte: r.from, $lte: r.to } };
  applyCommonDims(match, filter, {
    device: 'deviceType',
    country: 'country',
    userId: 'userId',
    sessionId: 'sessionId',
  });
  if (filter.eventName) match['name'] = filter.eventName;
  if (filter.category) match['properties.category'] = filter.category;
  const productIds = await resolveProductIds(filter);
  applyProductPropertyFilter(match, productIds);
  return match;
}

export function buildPageViewMatch(filter: AnalyticsFilter, range?: DateRange): MongoMatch {
  const r = range ?? resolveDateRange(filter);
  const match: MongoMatch = { viewedAt: { $gte: r.from, $lte: r.to } };
  applyCommonDims(match, filter, {
    device: 'deviceType',
    country: 'country',
    userId: 'userId',
    sessionId: 'sessionId',
  });
  return match;
}

export async function buildVisitorMatch(
  filter: AnalyticsFilter,
  range?: DateRange,
): Promise<MongoMatch> {
  const r = range ?? resolveDateRange(filter);
  const match: MongoMatch = { lastSeenAt: { $gte: r.from, $lte: r.to } };
  if (filter.country) match['geo.countryCode'] = filter.country;
  if (filter.city) match['geo.city'] = { $regex: filter.city, $options: 'i' };
  if (filter.device) match['device.type'] = filter.device;
  if (filter.browser) match['device.browser'] = { $regex: filter.browser, $options: 'i' };
  if (filter.userId) match['userId'] = asObjectId(filter.userId);
  if (filter.trafficSource) match['trafficSource'] = filter.trafficSource;

  if (filter.q) {
    const q = filter.q.trim();
    const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escaped = escapeRegex(q);
    const regex = new RegExp(escaped, 'i');
    const tokens = q.split(/\s+/).filter(Boolean);
    const tokenClauses = tokens.map((token) => {
      const tokenRegex = new RegExp(escapeRegex(token), 'i');
      return {
        $or: [{ email: tokenRegex }, { firstName: tokenRegex }, { lastName: tokenRegex }],
      };
    });

    const users = await UserModel.find({
      isDeleted: false,
      $or: [
        { email: regex },
        { firstName: regex },
        { lastName: regex },
        {
          $expr: {
            $regexMatch: {
              input: {
                $trim: {
                  input: {
                    $concat: [{ $ifNull: ['$firstName', ''] }, ' ', { $ifNull: ['$lastName', ''] }],
                  },
                },
              },
              regex: escaped,
              options: 'i',
            },
          },
        },
        ...(tokens.length > 1 ? [{ $and: tokenClauses }] : []),
      ],
    })
      .select('_id')
      .limit(50)
      .lean();
    const userIds = users.map((user) => user._id);
    match['$or'] = [
      { visitorId: regex },
      { referrer: regex },
      { utmSource: regex },
      { utmMedium: regex },
      { utmCampaign: regex },
      { 'geo.city': regex },
      { 'geo.country': regex },
      { 'geo.countryCode': regex },
      ...(userIds.length ? [{ userId: { $in: userIds } }] : []),
    ];
  }

  return match;
}

export async function buildOrderMatch(
  filter: AnalyticsFilter,
  options?: { range?: DateRange; defaultStatuses?: string[] },
): Promise<MongoMatch> {
  const r = options?.range ?? resolveDateRange(filter);
  const receivedAt = orderReceivedAtExpr();
  const match: MongoMatch = {
    isDeleted: { $ne: true },
    $expr: {
      $and: [{ $gte: [receivedAt, r.from] }, { $lte: [receivedAt, r.to] }],
    },
  };

  if (filter.orderStatus) {
    match['status'] = filter.orderStatus;
  } else if (options?.defaultStatuses?.length) {
    match['status'] = { $in: options.defaultStatuses };
  }

  if (filter.userId) match['userId'] = asObjectId(filter.userId);

  const productIds = await resolveProductIds(filter);
  if (productIds !== null) {
    match['items.productId'] =
      productIds.length === 0
        ? { $in: [] }
        : {
            $in: productIds
              .filter((id) => Types.ObjectId.isValid(id))
              .map((id) => new Types.ObjectId(id)),
          };
  }

  if (filter.category && Types.ObjectId.isValid(filter.category)) {
    const cats = await ProductModel.find({
      $or: [
        { categoryId: new Types.ObjectId(filter.category) },
        { categoryIds: new Types.ObjectId(filter.category) },
      ],
      isDeleted: { $ne: true },
    })
      .select('_id')
      .lean();
    const catProductIds = cats.map((p) => p._id);
    if (match['items.productId'] && typeof match['items.productId'] === 'object') {
      const existing = (match['items.productId'] as { $in?: Types.ObjectId[] }).$in ?? [];
      const set = new Set(existing.map(String));
      match['items.productId'] = {
        $in: catProductIds.filter((id) => set.has(String(id))),
      };
    } else if (!match['items.productId']) {
      match['items.productId'] = { $in: catProductIds };
    }
  }

  return match;
}

/** Merge a base match with extra constraints (e.g. event name $in). */
export function mergeMatch(base: MongoMatch, extra: MongoMatch): MongoMatch {
  return { ...base, ...extra };
}

export type { FilterQuery };
export { resolveDateRange };
