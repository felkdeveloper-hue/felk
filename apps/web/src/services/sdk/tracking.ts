import { http } from '@/lib/http-client';
import { getMetaTestEventCode, metaPixelTrack } from '@/lib/analytics/meta-pixel';
import {
  collectMetaBrowserParams,
  getMetaFbc,
  getMetaFbp,
} from '@/lib/analytics/meta-param-builder';

export interface MetaContentItem {
  id: string;
  quantity: number;
  item_price: number;
}

export interface MetaProductPayload {
  contentIds: string[];
  contents: MetaContentItem[];
  contentType?: 'product';
  numItems: number;
  currency: string;
  value: number;
  contentName?: string;
}

export interface TrackEventPayload {
  eventName: string;
  url?: string;
  eventId?: string;
  customData?: Record<string, unknown>;
  tiktokProperties?: Record<string, unknown>;
  userData?: {
    email?: string | null;
    phone?: string | null;
    fbp?: string | null;
    fbc?: string | null;
    ttclid?: string | null;
  };
  /** Skip Conversions API (Pixel only). Used for PageView. */
  browserOnly?: boolean;
}

const CAPI_EVENTS = new Set([
  'ViewContent',
  'AddToCart',
  'InitiateCheckout',
  'AddPaymentInfo',
  'Purchase',
]);

const sentPurchaseEventIds = new Set<string>();

function generateEventId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export function purchaseEventId(orderNumber: string): string {
  return `purchase-${orderNumber}`;
}

export function checkoutEventId(checkoutToken: string): string {
  return `checkout-${checkoutToken}`;
}

function getFbp(): string | null {
  return getMetaFbp();
}

function getFbc(): string | null {
  return getMetaFbc();
}

function getTtclid(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('ttclid');
  } catch {
    return null;
  }
}

function buildProductCustomData(data: MetaProductPayload): Record<string, unknown> {
  return {
    content_ids: data.contentIds,
    contents: data.contents,
    content_type: data.contentType ?? 'product',
    num_items: data.numItems,
    currency: data.currency,
    value: data.value,
    ...(data.contentName ? { content_name: data.contentName } : {}),
  };
}

function singleItemPayload(
  contentId: string,
  currency: string,
  value: number,
  quantity = 1,
  contentName?: string,
): MetaProductPayload {
  return {
    contentIds: [contentId],
    contents: [{ id: contentId, quantity, item_price: value }],
    contentType: 'product',
    numItems: quantity,
    currency,
    value: value * quantity,
    contentName,
  };
}

export const trackingApi = {
  async track(payload: TrackEventPayload): Promise<void> {
    const eventId = payload.eventId ?? generateEventId();
    const url = payload.url ?? (typeof window !== 'undefined' ? window.location.href : undefined);

    void metaPixelTrack(payload.eventName, payload.customData, eventId);

    const sendToCapi = !payload.browserOnly && CAPI_EVENTS.has(payload.eventName);
    if (!sendToCapi) return;

    try {
      await collectMetaBrowserParams();
      const userData = {
        ...(payload.userData ?? {}),
        fbp: payload.userData?.fbp ?? getFbp(),
        fbc: payload.userData?.fbc ?? getFbc(),
        ttclid: payload.userData?.ttclid ?? getTtclid(),
      };
      const testEventCode = getMetaTestEventCode();
      await http.post('/tracking/event', {
        ...payload,
        eventId,
        url,
        userData,
        ...(testEventCode ? { testEventCode } : {}),
      });
    } catch {
      // Tracking failures must never surface to the user
    }
  },

  pageView(url?: string) {
    return trackingApi.track({ eventName: 'PageView', url, browserOnly: true });
  },

  viewContent(contentId: string, contentName?: string, currency = 'LKR', value?: number) {
    const price = value ?? 0;
    const data = singleItemPayload(contentId, currency, price, 1, contentName);
    return trackingApi.track({
      eventName: 'ViewContent',
      customData: buildProductCustomData(data),
      tiktokProperties: { contentId, contentName, currency, value: price },
    });
  },

  search(query: string) {
    return trackingApi.track({
      eventName: 'Search',
      customData: { search_string: query },
      tiktokProperties: { searchString: query },
    });
  },

  addToWishlist(contentId: string, contentName?: string, currency?: string, value?: number) {
    const cur = currency ?? 'LKR';
    const price = value ?? 0;
    const data = singleItemPayload(contentId, cur, price, 1, contentName);
    return trackingApi.track({
      eventName: 'AddToWishlist',
      customData: buildProductCustomData(data),
      tiktokProperties: { contentId, contentName, currency: cur, value: price },
    });
  },

  addToCart(
    contentId: string,
    contentName: string,
    currency: string,
    unitPrice: number,
    quantity = 1,
  ) {
    const data = singleItemPayload(contentId, currency, unitPrice, quantity, contentName);
    return trackingApi.track({
      eventName: 'AddToCart',
      customData: buildProductCustomData(data),
      tiktokProperties: {
        contentId,
        contentName,
        currency,
        value: data.value,
        numItems: quantity,
      },
    });
  },

  initiateCheckout(
    data: MetaProductPayload,
    eventId?: string,
    userData?: TrackEventPayload['userData'],
  ) {
    return trackingApi.track({
      eventName: 'InitiateCheckout',
      eventId: eventId ?? generateEventId(),
      customData: buildProductCustomData(data),
      userData,
      tiktokProperties: {
        currency: data.currency,
        value: data.value,
        numItems: data.numItems,
        contentId: data.contentIds[0],
      },
    });
  },

  purchase(
    orderNumber: string,
    data: MetaProductPayload,
    userData?: TrackEventPayload['userData'],
    options?: { browserOnly?: boolean },
  ) {
    const eventId = purchaseEventId(orderNumber);
    if (sentPurchaseEventIds.has(eventId)) return Promise.resolve();
    sentPurchaseEventIds.add(eventId);

    try {
      if (
        typeof sessionStorage !== 'undefined' &&
        sessionStorage.getItem(`meta_purchase_${eventId}`)
      ) {
        return Promise.resolve();
      }
      sessionStorage.setItem(`meta_purchase_${eventId}`, '1');
    } catch {
      /* private mode */
    }

    const customData = {
      ...buildProductCustomData(data),
      order_id: orderNumber,
    };

    return trackingApi.track({
      eventName: 'Purchase',
      eventId,
      customData,
      userData,
      browserOnly: options?.browserOnly,
      tiktokProperties: {
        currency: data.currency,
        value: data.value,
        numItems: data.numItems,
        contentId: data.contentIds[0],
        orderId: orderNumber,
      },
    });
  },
};

/** Build Meta product payload from checkout/cart line items. */
export function buildMetaProductFromLines(
  lines: Array<{
    variantId: string;
    quantity: number;
    unitPrice?: number;
    salePrice?: number;
    lineSubtotal?: number;
  }>,
  currency: string,
  grandTotal?: number,
): MetaProductPayload {
  const contents = lines.map((line) => {
    const itemPrice =
      typeof line.salePrice === 'number' && line.salePrice > 0
        ? line.salePrice
        : typeof line.unitPrice === 'number'
          ? line.unitPrice
          : line.lineSubtotal && line.quantity > 0
            ? Number((line.lineSubtotal / line.quantity).toFixed(2))
            : 0;
    return {
      id: line.variantId,
      quantity: line.quantity,
      item_price: itemPrice,
    };
  });
  const numItems = lines.reduce((sum, line) => sum + line.quantity, 0);
  const value =
    grandTotal ?? contents.reduce((sum, item) => sum + item.item_price * item.quantity, 0);

  return {
    contentIds: lines.map((line) => line.variantId),
    contents,
    contentType: 'product',
    numItems,
    currency,
    value,
  };
}
