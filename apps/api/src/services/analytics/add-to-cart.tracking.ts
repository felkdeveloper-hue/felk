import type { Request } from 'express';
import { appConfig } from '@/config/app.config.js';
import { resolveExplicitMetaClickIds } from '@/services/analytics/meta-param-builder.js';
import type { TrackingUserData } from '@/services/analytics/analytics.service.js';

function shopUrl(pathOrUrl?: string | null): string | undefined {
  if (pathOrUrl && /^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const base = appConfig.email?.shopUrl?.replace(/\/$/, '');
  if (!base) return undefined;
  if (!pathOrUrl) return base;
  return `${base}${pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`}`;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export function buildAddToCartCapiInput(input: {
  variantId: string;
  quantity: number;
  eventId?: string | null;
  fbp?: string | null;
  fbc?: string | null;
  fbclid?: string | null;
  eventSourceUrl?: string | null;
  line?: Record<string, unknown> | null;
  user?: {
    id?: string;
    email?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
  } | null;
  customerId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}) {
  const line = input.line ?? {};
  const unitPrice =
    asNumber(line.unitPrice) ??
    asNumber(line.currentPrice) ??
    asNumber(line.salePrice) ??
    asNumber(line.priceAtAdd) ??
    0;
  const quantity = input.quantity > 0 ? input.quantity : 1;
  const currency = asString(line.currency) ?? 'LKR';
  const contentName = asString(line.name) ?? asString(line.title);
  const click = resolveExplicitMetaClickIds({
    fbp: input.fbp,
    fbc: input.fbc,
    fbclid: input.fbclid,
  });

  const userData: TrackingUserData = {
    email: input.user?.email ?? null,
    firstName: input.user?.firstName ?? null,
    lastName: input.user?.lastName ?? null,
    phone: input.user?.phone ?? null,
    ipAddress: input.ip ?? null,
    userAgent: input.userAgent ?? null,
    externalId: input.customerId || input.user?.id || null,
    fbp: click.fbp ?? null,
    fbc: click.fbc ?? null,
  };

  return {
    eventName: 'AddToCart' as const,
    eventId: input.eventId?.trim() || undefined,
    url: shopUrl(input.eventSourceUrl),
    userData,
    customData: {
      content_ids: [input.variantId],
      contents: [{ id: input.variantId, quantity, item_price: unitPrice }],
      content_type: 'product',
      num_items: quantity,
      currency,
      value: Number((unitPrice * quantity).toFixed(2)),
      ...(contentName ? { content_name: contentName } : {}),
    },
  };
}

/** Fire-and-forget CAPI AddToCart after a successful POST /cart/items. */
export function trackAddToCartAfterCartAdd(input: {
  req: Request;
  variantId: string;
  quantity: number;
  eventId?: string | null;
  fbp?: string | null;
  fbc?: string | null;
  fbclid?: string | null;
  line?: Record<string, unknown> | null;
  customerId?: string | null;
}): void {
  try {
    const sharedEventId = input.eventId?.trim();
    if (!sharedEventId) return;

    const payload = buildAddToCartCapiInput({
      variantId: input.variantId,
      quantity: input.quantity,
      eventId: sharedEventId,
      fbp: input.fbp,
      fbc: input.fbc,
      fbclid: input.fbclid,
      eventSourceUrl:
        typeof input.req.headers.referer === 'string' ? input.req.headers.referer : null,
      line: input.line,
      user: input.req.user
        ? {
            id: input.req.user.id,
            email: input.req.user.email,
            firstName: input.req.user.firstName,
            lastName: input.req.user.lastName,
          }
        : null,
      customerId: input.customerId,
      ip: input.req.ip,
      userAgent: input.req.get('user-agent'),
    });

    void import('@/services/analytics/analytics.service.js')
      .then(({ analyticsService }) => analyticsService.track(payload).catch(() => {}))
      .catch(() => {});
  } catch {
    /* tracking must never affect cart */
  }
}
