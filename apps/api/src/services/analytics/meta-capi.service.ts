import { randomUUID } from 'node:crypto';
import { appConfig } from '@/config/app.config';
import { logger } from '@/config/logger';
import { fetchWithRetry } from '@/utils/http-retry';
import { hashPii, hashPhone } from '@/utils/pii-hash';
import { AnalyticsEventLogModel } from '@/models/analytics.model';

const GRAPH_API_VERSION = 'v19.0';

export interface MetaUserData {
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  city?: string | null;
  country?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  fbp?: string | null;
  fbc?: string | null;
  externalId?: string | null;
}

export interface MetaCustomData {
  currency?: string;
  value?: number;
  contentIds?: string[];
  contentType?: string;
  contentName?: string;
  contentCategory?: string;
  numItems?: number;
  searchString?: string;
  orderId?: string;
  [key: string]: unknown;
}

export interface MetaEventInput {
  eventName: string;
  eventId?: string;
  eventSourceUrl?: string;
  userData?: MetaUserData;
  customData?: MetaCustomData;
}

function buildUserData(ud: MetaUserData) {
  return {
    ...(ud.email && { em: hashPii(ud.email) }),
    ...(ud.phone && { ph: hashPhone(ud.phone) }),
    ...(ud.firstName && { fn: hashPii(ud.firstName) }),
    ...(ud.lastName && { ln: hashPii(ud.lastName) }),
    ...(ud.city && { ct: hashPii(ud.city) }),
    ...(ud.country && { country: hashPii(ud.country) }),
    ...(ud.ipAddress && { client_ip_address: ud.ipAddress }),
    ...(ud.userAgent && { client_user_agent: ud.userAgent }),
    ...(ud.fbp && { fbp: ud.fbp }),
    ...(ud.fbc && { fbc: ud.fbc }),
    ...(ud.externalId && { external_id: hashPii(ud.externalId) }),
  };
}

export class MetaCapiService {
  private get configured() {
    return appConfig.analytics.meta.configured;
  }

  private endpoint(): string {
    const { pixelId } = appConfig.analytics.meta;
    return `https://graph.facebook.com/${GRAPH_API_VERSION}/${pixelId}/events`;
  }

  async sendEvent(input: MetaEventInput): Promise<void> {
    if (!this.configured) {
      logger.debug({ event: input.eventName }, 'Meta CAPI: not configured, skipping');
      return;
    }

    const eventId = input.eventId ?? randomUUID();
    const eventTime = Math.floor(Date.now() / 1000);

    const payload = {
      data: [
        {
          event_name: input.eventName,
          event_time: eventTime,
          event_id: eventId,
          ...(input.eventSourceUrl && { event_source_url: input.eventSourceUrl }),
          action_source: 'website',
          ...(input.userData && { user_data: buildUserData(input.userData) }),
          ...(input.customData && { custom_data: input.customData }),
        },
      ],
    };

    const logDoc = await AnalyticsEventLogModel.create({
      provider: 'meta',
      eventName: input.eventName,
      eventId,
      status: 'pending',
      payload,
    });

    try {
      const url = `${this.endpoint()}?access_token=${appConfig.analytics.meta.token}`;
      await fetchWithRetry(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      logDoc.status = 'sent';
      logDoc.sentAt = new Date();
      await logDoc.save();

      logger.info({ event: input.eventName, eventId }, 'Meta CAPI: event sent');
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      logDoc.status = 'retrying';
      logDoc.lastError = errMsg;
      logDoc.attempts = 1;
      logDoc.nextAttemptAt = new Date(Date.now() + 30_000);
      await logDoc.save();
      logger.warn(
        { event: input.eventName, eventId, err: errMsg },
        'Meta CAPI: event queued for retry',
      );
    }
  }

  /** Retry an existing AnalyticsEventLog document (called by the sweep). */
  async retryFromLog(doc: { provider: string; payload: unknown }): Promise<void> {
    if (doc.provider !== 'meta') return;
    if (!this.configured) throw new Error('Meta CAPI not configured');

    const url = `${this.endpoint()}?access_token=${appConfig.analytics.meta.token}`;
    await fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(doc.payload),
    });
  }

  // ---- Convenience event methods ----

  trackPageView(url: string, userData?: MetaUserData, eventId?: string) {
    return this.sendEvent({ eventName: 'PageView', eventSourceUrl: url, userData, eventId });
  }

  trackViewContent(data: {
    contentId: string;
    contentName?: string;
    currency?: string;
    value?: number;
    url?: string;
    userData?: MetaUserData;
    eventId?: string;
  }) {
    return this.sendEvent({
      eventName: 'ViewContent',
      eventSourceUrl: data.url,
      userData: data.userData,
      eventId: data.eventId,
      customData: {
        content_ids: [data.contentId],
        content_type: 'product',
        ...(data.contentName && { content_name: data.contentName }),
        ...(data.currency && { currency: data.currency }),
        ...(data.value !== undefined && { value: data.value }),
      },
    });
  }

  trackSearch(searchString: string, userData?: MetaUserData, eventId?: string) {
    return this.sendEvent({
      eventName: 'Search',
      userData,
      eventId,
      customData: { search_string: searchString },
    });
  }

  trackAddToWishlist(data: {
    contentId: string;
    contentName?: string;
    currency?: string;
    value?: number;
    userData?: MetaUserData;
    eventId?: string;
  }) {
    return this.sendEvent({
      eventName: 'AddToWishlist',
      userData: data.userData,
      eventId: data.eventId,
      customData: {
        content_ids: [data.contentId],
        content_type: 'product',
        ...(data.contentName && { content_name: data.contentName }),
        ...(data.currency && { currency: data.currency }),
        ...(data.value !== undefined && { value: data.value }),
      },
    });
  }

  trackAddToCart(data: {
    contentId: string;
    contentName?: string;
    currency: string;
    value: number;
    userData?: MetaUserData;
    eventId?: string;
  }) {
    return this.sendEvent({
      eventName: 'AddToCart',
      userData: data.userData,
      eventId: data.eventId,
      customData: {
        content_ids: [data.contentId],
        content_type: 'product',
        content_name: data.contentName,
        currency: data.currency,
        value: data.value,
      },
    });
  }

  trackInitiateCheckout(data: {
    contentIds?: string[];
    numItems?: number;
    currency: string;
    value: number;
    userData?: MetaUserData;
    eventId?: string;
  }) {
    return this.sendEvent({
      eventName: 'InitiateCheckout',
      userData: data.userData,
      eventId: data.eventId,
      customData: {
        ...(data.contentIds && { content_ids: data.contentIds }),
        ...(data.numItems && { num_items: data.numItems }),
        currency: data.currency,
        value: data.value,
      },
    });
  }

  trackAddPaymentInfo(data: {
    currency: string;
    value: number;
    userData?: MetaUserData;
    eventId?: string;
  }) {
    return this.sendEvent({
      eventName: 'AddPaymentInfo',
      userData: data.userData,
      eventId: data.eventId,
      customData: { currency: data.currency, value: data.value },
    });
  }

  trackPurchase(data: {
    orderId: string;
    currency: string;
    value: number;
    contentIds?: string[];
    numItems?: number;
    userData?: MetaUserData;
    eventId?: string;
  }) {
    return this.sendEvent({
      eventName: 'Purchase',
      userData: data.userData,
      eventId: data.eventId,
      customData: {
        order_id: data.orderId,
        currency: data.currency,
        value: data.value,
        ...(data.contentIds && { content_ids: data.contentIds }),
        ...(data.numItems !== undefined && { num_items: data.numItems }),
      },
    });
  }

  trackLead(userData?: MetaUserData, eventId?: string) {
    return this.sendEvent({ eventName: 'Lead', userData, eventId });
  }

  trackCompleteRegistration(userData?: MetaUserData, eventId?: string) {
    return this.sendEvent({ eventName: 'CompleteRegistration', userData, eventId });
  }
}

export const metaCapiService = new MetaCapiService();
