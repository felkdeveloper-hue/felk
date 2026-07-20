import { randomUUID } from 'node:crypto';
import { appConfig } from '@/config/app.config';
import { logger } from '@/config/logger';
import { fetchWithRetry } from '@/utils/http-retry';
import { hashPii, hashPhone } from '@/utils/pii-hash';
import { AnalyticsEventLogModel } from '@/models/analytics.model';

const TIKTOK_EVENTS_API = 'https://business-api.tiktok.com/open_api/v1.3/event/track/';

export interface TikTokUserData {
  email?: string | null;
  phone?: string | null;
  externalId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  ttclid?: string | null;
  ttp?: string | null;
}

export interface TikTokProperties {
  currency?: string;
  value?: number;
  contentId?: string;
  contentName?: string;
  contentType?: string;
  contentCategory?: string;
  numItems?: number;
  orderId?: string;
  searchString?: string;
  [key: string]: unknown;
}

export interface TikTokEventInput {
  eventName: string;
  eventId?: string;
  pageUrl?: string;
  userData?: TikTokUserData;
  properties?: TikTokProperties;
}

function buildUserData(ud: TikTokUserData) {
  const result: Record<string, string | undefined> = {};
  if (ud.email) result.email = hashPii(ud.email) ?? undefined;
  if (ud.phone) result.phone_number = hashPhone(ud.phone) ?? undefined;
  if (ud.externalId) result.external_id = hashPii(ud.externalId) ?? undefined;
  if (ud.ipAddress) result.ip = ud.ipAddress;
  if (ud.userAgent) result.user_agent = ud.userAgent;
  if (ud.ttclid) result.ttclid = ud.ttclid;
  if (ud.ttp) result.ttp = ud.ttp;
  return result;
}

function buildProperties(props?: TikTokProperties) {
  if (!props) return undefined;
  const result: Record<string, unknown> = {};
  if (props.currency) result.currency = props.currency;
  if (props.value !== undefined) result.value = props.value;
  if (props.contentId) result.content_id = props.contentId;
  if (props.contentName) result.content_name = props.contentName;
  if (props.contentType) result.content_type = props.contentType;
  if (props.contentCategory) result.content_category = props.contentCategory;
  if (props.numItems !== undefined) result.num_items = props.numItems;
  if (props.orderId) result.order_id = props.orderId;
  if (props.searchString) result.query = props.searchString;
  // Pass through any extra keys
  for (const [k, v] of Object.entries(props)) {
    if (!(k in result)) result[k] = v;
  }
  return result;
}

export class TikTokEventsService {
  private get configured() {
    return appConfig.analytics.tiktok.configured;
  }

  async sendEvent(input: TikTokEventInput): Promise<void> {
    if (!this.configured) {
      logger.debug({ event: input.eventName }, 'TikTok Events: not configured, skipping');
      return;
    }

    const eventId = input.eventId ?? randomUUID();
    const timestamp = Math.floor(Date.now() / 1000).toString();

    const payload = {
      pixel_code: appConfig.analytics.tiktok.pixelId,
      event: input.eventName,
      event_id: eventId,
      timestamp,
      context: {
        ...(input.pageUrl && { page: { url: input.pageUrl } }),
        ...(input.userData && { user: buildUserData(input.userData) }),
      },
      ...(input.properties && { properties: buildProperties(input.properties) }),
    };

    const logDoc = await AnalyticsEventLogModel.create({
      provider: 'tiktok',
      eventName: input.eventName,
      eventId,
      status: 'pending',
      payload,
    });

    try {
      await fetchWithRetry(TIKTOK_EVENTS_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Access-Token': appConfig.analytics.tiktok.accessToken ?? '',
        },
        body: JSON.stringify(payload),
      });

      logDoc.status = 'sent';
      logDoc.sentAt = new Date();
      await logDoc.save();

      logger.info({ event: input.eventName, eventId }, 'TikTok Events: event sent');
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      logDoc.status = 'retrying';
      logDoc.lastError = errMsg;
      logDoc.attempts = 1;
      logDoc.nextAttemptAt = new Date(Date.now() + 30_000);
      await logDoc.save();
      logger.warn(
        { event: input.eventName, eventId, err: errMsg },
        'TikTok Events: event queued for retry',
      );
    }
  }

  /** Retry an existing AnalyticsEventLog document (called by the sweep). */
  async retryFromLog(doc: { provider: string; payload: unknown }): Promise<void> {
    if (doc.provider !== 'tiktok') return;
    if (!this.configured) throw new Error('TikTok Events not configured');

    await fetchWithRetry(TIKTOK_EVENTS_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Access-Token': appConfig.analytics.tiktok.accessToken ?? '',
      },
      body: JSON.stringify(doc.payload),
    });
  }

  // ---- Convenience event methods ----

  trackPageView(url: string, userData?: TikTokUserData, eventId?: string) {
    return this.sendEvent({
      eventName: 'ViewContent',
      pageUrl: url,
      userData,
      eventId,
      properties: { content_type: 'page' },
    });
  }

  trackViewContent(data: {
    contentId: string;
    contentName?: string;
    currency?: string;
    value?: number;
    url?: string;
    userData?: TikTokUserData;
    eventId?: string;
  }) {
    return this.sendEvent({
      eventName: 'ViewContent',
      pageUrl: data.url,
      userData: data.userData,
      eventId: data.eventId,
      properties: {
        contentId: data.contentId,
        contentName: data.contentName,
        contentType: 'product',
        currency: data.currency,
        value: data.value,
      },
    });
  }

  trackSearch(query: string, userData?: TikTokUserData, eventId?: string) {
    return this.sendEvent({
      eventName: 'Search',
      userData,
      eventId,
      properties: { searchString: query },
    });
  }

  trackAddToCart(data: {
    contentId: string;
    contentName?: string;
    currency: string;
    value: number;
    userData?: TikTokUserData;
    eventId?: string;
  }) {
    return this.sendEvent({
      eventName: 'AddToCart',
      userData: data.userData,
      eventId: data.eventId,
      properties: {
        contentId: data.contentId,
        contentName: data.contentName,
        contentType: 'product',
        currency: data.currency,
        value: data.value,
      },
    });
  }

  trackInitiateCheckout(data: {
    contentId?: string;
    numItems?: number;
    currency: string;
    value: number;
    userData?: TikTokUserData;
    eventId?: string;
  }) {
    return this.sendEvent({
      eventName: 'InitiateCheckout',
      userData: data.userData,
      eventId: data.eventId,
      properties: {
        ...(data.contentId && { contentId: data.contentId }),
        numItems: data.numItems,
        currency: data.currency,
        value: data.value,
      },
    });
  }

  trackCompletePayment(data: {
    orderId: string;
    currency: string;
    value: number;
    contentId?: string;
    numItems?: number;
    userData?: TikTokUserData;
    eventId?: string;
  }) {
    return this.sendEvent({
      eventName: 'CompletePayment',
      userData: data.userData,
      eventId: data.eventId,
      properties: {
        orderId: data.orderId,
        currency: data.currency,
        value: data.value,
        ...(data.contentId && { contentId: data.contentId }),
        ...(data.numItems !== undefined && { numItems: data.numItems }),
      },
    });
  }

  trackPurchase(data: {
    orderId: string;
    currency: string;
    value: number;
    contentId?: string;
    userData?: TikTokUserData;
    eventId?: string;
  }) {
    return this.trackCompletePayment(data);
  }

  trackRegistration(userData?: TikTokUserData, eventId?: string) {
    return this.sendEvent({ eventName: 'Registration', userData, eventId });
  }

  trackWishlist(data: {
    contentId: string;
    contentName?: string;
    currency?: string;
    value?: number;
    userData?: TikTokUserData;
    eventId?: string;
  }) {
    return this.sendEvent({
      eventName: 'AddToWishlist',
      userData: data.userData,
      eventId: data.eventId,
      properties: {
        contentId: data.contentId,
        contentName: data.contentName,
        contentType: 'product',
        currency: data.currency,
        value: data.value,
      },
    });
  }
}

export const tikTokEventsService = new TikTokEventsService();
