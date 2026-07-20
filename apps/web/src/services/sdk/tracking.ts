import { http } from '@/lib/http-client';

export interface TrackEventPayload {
  eventName: string;
  url?: string;
  eventId?: string;
  customData?: Record<string, unknown>;
  tiktokProperties?: Record<string, unknown>;
  userData?: {
    email?: string | null;
    fbp?: string | null;
    fbc?: string | null;
    ttclid?: string | null;
  };
}

function getFbp(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/_fbp=([^;]+)/);
  return match ? (match[1] ?? null) : null;
}

function getFbc(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/_fbc=([^;]+)/);
  return match ? (match[1] ?? null) : null;
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

export const trackingApi = {
  async track(payload: TrackEventPayload): Promise<void> {
    try {
      await http.post('/tracking/event', {
        ...payload,
        url: payload.url ?? (typeof window !== 'undefined' ? window.location.href : undefined),
        userData: {
          ...(payload.userData ?? {}),
          fbp: payload.userData?.fbp ?? getFbp(),
          fbc: payload.userData?.fbc ?? getFbc(),
          ttclid: payload.userData?.ttclid ?? getTtclid(),
        },
      });
    } catch {
      // Tracking failures must never surface to the user
    }
  },

  pageView(url?: string) {
    return trackingApi.track({ eventName: 'PageView', url });
  },

  viewContent(contentId: string, contentName?: string, currency?: string, value?: number) {
    return trackingApi.track({
      eventName: 'ViewContent',
      customData: { content_ids: [contentId], content_name: contentName, currency, value },
      tiktokProperties: { contentId, contentName, currency, value },
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
    return trackingApi.track({
      eventName: 'AddToWishlist',
      customData: { content_ids: [contentId], content_name: contentName, currency, value },
      tiktokProperties: { contentId, contentName, currency, value },
    });
  },

  addToCart(contentId: string, contentName: string, currency: string, value: number) {
    return trackingApi.track({
      eventName: 'AddToCart',
      customData: { content_ids: [contentId], content_name: contentName, currency, value },
      tiktokProperties: { contentId, contentName, currency, value },
    });
  },

  initiateCheckout(currency: string, value: number, numItems?: number) {
    return trackingApi.track({
      eventName: 'InitiateCheckout',
      customData: { currency, value, num_items: numItems },
      tiktokProperties: { currency, value, numItems },
    });
  },
};
