import { randomUUID } from 'node:crypto';
import { metaCapiService, type MetaUserData, type MetaCustomData } from './meta-capi.service';
import {
  tikTokEventsService,
  type TikTokUserData,
  type TikTokProperties,
} from './tiktok-events.service';

export interface TrackingUserData {
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  city?: string | null;
  country?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  externalId?: string | null;
  fbp?: string | null;
  fbc?: string | null;
  ttclid?: string | null;
  ttp?: string | null;
}

function toMetaUserData(ud?: TrackingUserData | null): MetaUserData | undefined {
  if (!ud) return undefined;
  return {
    email: ud.email,
    phone: ud.phone,
    firstName: ud.firstName,
    lastName: ud.lastName,
    city: ud.city,
    country: ud.country,
    ipAddress: ud.ipAddress,
    userAgent: ud.userAgent,
    externalId: ud.externalId,
    fbp: ud.fbp,
    fbc: ud.fbc,
  };
}

function toTikTokUserData(ud?: TrackingUserData | null): TikTokUserData | undefined {
  if (!ud) return undefined;
  return {
    email: ud.email,
    phone: ud.phone,
    externalId: ud.externalId,
    ipAddress: ud.ipAddress,
    userAgent: ud.userAgent,
    ttclid: ud.ttclid,
    ttp: ud.ttp,
  };
}

export interface TrackEventInput {
  eventName: string;
  url?: string;
  userData?: TrackingUserData | null;
  customData?: MetaCustomData;
  tiktokProperties?: TikTokProperties;
  /** Shared dedup ID; generated if not provided. */
  eventId?: string;
}

export class AnalyticsService {
  /**
   * Fan out a single event to both Meta CAPI and TikTok Events API
   * using a shared event_id for deduplication across providers.
   */
  async track(input: TrackEventInput): Promise<void> {
    const eventId = input.eventId ?? randomUUID();
    const metaUserData = toMetaUserData(input.userData);
    const tiktokUserData = toTikTokUserData(input.userData);

    await Promise.allSettled([
      metaCapiService.sendEvent({
        eventName: input.eventName,
        eventId,
        eventSourceUrl: input.url,
        userData: metaUserData,
        customData: input.customData,
      }),
      tikTokEventsService.sendEvent({
        eventName: input.eventName,
        eventId,
        pageUrl: input.url,
        userData: tiktokUserData,
        properties: input.tiktokProperties,
      }),
    ]);
  }

  async trackPageView(url: string, userData?: TrackingUserData | null) {
    const eventId = randomUUID();
    await Promise.allSettled([
      metaCapiService.trackPageView(url, toMetaUserData(userData), eventId),
      tikTokEventsService.trackPageView(url, toTikTokUserData(userData), eventId),
    ]);
  }

  async trackViewContent(data: {
    contentId: string;
    contentName?: string;
    currency?: string;
    value?: number;
    url?: string;
    userData?: TrackingUserData | null;
    eventId?: string;
  }) {
    const eventId = data.eventId ?? randomUUID();
    await Promise.allSettled([
      metaCapiService.trackViewContent({
        ...data,
        userData: toMetaUserData(data.userData),
        eventId,
      }),
      tikTokEventsService.trackViewContent({
        ...data,
        userData: toTikTokUserData(data.userData),
        eventId,
      }),
    ]);
  }

  async trackSearch(searchString: string, userData?: TrackingUserData | null) {
    const eventId = randomUUID();
    await Promise.allSettled([
      metaCapiService.trackSearch(searchString, toMetaUserData(userData), eventId),
      tikTokEventsService.trackSearch(searchString, toTikTokUserData(userData), eventId),
    ]);
  }

  async trackAddToWishlist(data: {
    contentId: string;
    contentName?: string;
    currency?: string;
    value?: number;
    userData?: TrackingUserData | null;
    eventId?: string;
  }) {
    const eventId = data.eventId ?? randomUUID();
    await Promise.allSettled([
      metaCapiService.trackAddToWishlist({
        ...data,
        userData: toMetaUserData(data.userData),
        eventId,
      }),
      tikTokEventsService.trackWishlist({
        ...data,
        userData: toTikTokUserData(data.userData),
        eventId,
      }),
    ]);
  }

  async trackAddToCart(data: {
    contentId: string;
    contentName?: string;
    currency: string;
    value: number;
    userData?: TrackingUserData | null;
    eventId?: string;
  }) {
    const eventId = data.eventId ?? randomUUID();
    await Promise.allSettled([
      metaCapiService.trackAddToCart({ ...data, userData: toMetaUserData(data.userData), eventId }),
      tikTokEventsService.trackAddToCart({
        ...data,
        userData: toTikTokUserData(data.userData),
        eventId,
      }),
    ]);
  }

  async trackInitiateCheckout(data: {
    contentIds?: string[];
    numItems?: number;
    currency: string;
    value: number;
    userData?: TrackingUserData | null;
    eventId?: string;
  }) {
    const eventId = data.eventId ?? randomUUID();
    await Promise.allSettled([
      metaCapiService.trackInitiateCheckout({
        ...data,
        userData: toMetaUserData(data.userData),
        eventId,
      }),
      tikTokEventsService.trackInitiateCheckout({
        contentId: data.contentIds?.[0],
        numItems: data.numItems,
        currency: data.currency,
        value: data.value,
        userData: toTikTokUserData(data.userData),
        eventId,
      }),
    ]);
  }

  async trackAddPaymentInfo(data: {
    currency: string;
    value: number;
    userData?: TrackingUserData | null;
    eventId?: string;
  }) {
    const eventId = data.eventId ?? randomUUID();
    await metaCapiService.trackAddPaymentInfo({
      ...data,
      userData: toMetaUserData(data.userData),
      eventId,
    });
  }

  async trackPurchase(data: {
    orderId: string;
    currency: string;
    value: number;
    contentIds?: string[];
    numItems?: number;
    userData?: TrackingUserData | null;
    eventId?: string;
  }) {
    const eventId = data.eventId ?? randomUUID();
    await Promise.allSettled([
      metaCapiService.trackPurchase({ ...data, userData: toMetaUserData(data.userData), eventId }),
      tikTokEventsService.trackCompletePayment({
        orderId: data.orderId,
        currency: data.currency,
        value: data.value,
        contentId: data.contentIds?.[0],
        numItems: data.numItems,
        userData: toTikTokUserData(data.userData),
        eventId,
      }),
    ]);
  }

  async trackLead(userData?: TrackingUserData | null, eventId?: string) {
    const eid = eventId ?? randomUUID();
    await metaCapiService.trackLead(toMetaUserData(userData), eid);
  }

  async trackCompleteRegistration(userData?: TrackingUserData | null, eventId?: string) {
    const eid = eventId ?? randomUUID();
    await Promise.allSettled([
      metaCapiService.trackCompleteRegistration(toMetaUserData(userData), eid),
      tikTokEventsService.trackRegistration(toTikTokUserData(userData), eid),
    ]);
  }

  /** Called by the analytics retry sweep for failed event logs. */
  async retryEventLog(doc: { provider: string; payload: unknown }): Promise<void> {
    if (doc.provider === 'meta') {
      await metaCapiService.retryFromLog(doc);
    } else if (doc.provider === 'tiktok') {
      await tikTokEventsService.retryFromLog(doc);
    }
  }
}

export const analyticsService = new AnalyticsService();
