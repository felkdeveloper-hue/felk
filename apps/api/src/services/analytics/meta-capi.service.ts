import { randomUUID } from 'node:crypto';
import { appConfig } from '@/config/app.config.js';
import { logger } from '@/config/logger.js';
import { fetchWithRetry } from '@/utils/http-retry.js';
import { AnalyticsEventLogModel } from '@/models/analytics.model.js';
import {
  formatMetaDateOfBirth,
  hashMetaPii,
  sanitizeMetaClickId,
  sanitizeMetaClientIp,
} from '@/services/analytics/meta-param-builder.js';

const GRAPH_API_VERSION = 'v19.0';

interface MetaCapiResponse {
  events_received?: number;
  messages?: Array<{ message?: string; error?: { message?: string; type?: string } }>;
  fbtrace_id?: string;
  error?: { message?: string; type?: string; code?: number };
}

function parseMetaCapiResponse(data: unknown): MetaCapiResponse {
  if (!data || typeof data !== 'object') return {};
  return data as MetaCapiResponse;
}

function assertMetaAccepted(data: unknown, eventName: string): MetaCapiResponse {
  const response = parseMetaCapiResponse(data);
  if (response.error?.message) {
    throw new Error(`Meta rejected ${eventName}: ${response.error.message}`);
  }

  const received = response.events_received ?? 0;
  if (received < 1) {
    const detail =
      (response.messages ?? [])
        .map((m) => m.message ?? m.error?.message)
        .filter(Boolean)
        .join('; ') || `events_received=${received}`;
    throw new Error(`Meta rejected ${eventName}: ${detail}`);
  }

  return response;
}

export interface MetaUserData {
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  dateOfBirth?: Date | string | null;
  gender?: string | null;
  country?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  fbp?: string | null;
  fbc?: string | null;
  externalId?: string | null;
}

export interface MetaContentItem {
  id: string;
  quantity: number;
  item_price: number;
}

export interface MetaCustomData {
  currency?: string;
  value?: number;
  content_ids?: string[];
  contentIds?: string[];
  content_type?: string;
  contentType?: string;
  contents?: MetaContentItem[];
  content_name?: string;
  contentName?: string;
  contentCategory?: string;
  num_items?: number;
  numItems?: number;
  search_string?: string;
  searchString?: string;
  order_id?: string;
  orderId?: string;
  [key: string]: unknown;
}

export interface MetaEventInput {
  eventName: string;
  eventId?: string;
  eventSourceUrl?: string;
  referrerUrl?: string;
  userData?: MetaUserData;
  customData?: MetaCustomData;
  testEventCode?: string;
}

function normalizeCustomData(raw?: MetaCustomData): Record<string, unknown> | undefined {
  if (!raw) return undefined;

  const contentIds = raw.content_ids ?? raw.contentIds;
  const contents = raw.contents;
  const numItems = raw.num_items ?? raw.numItems;
  const contentType = raw.content_type ?? raw.contentType ?? (contentIds ? 'product' : undefined);

  return {
    ...(raw.currency && { currency: raw.currency }),
    ...(raw.value !== undefined && { value: raw.value }),
    ...(contentIds && { content_ids: contentIds }),
    ...(contentType && { content_type: contentType }),
    ...(contents && { contents }),
    ...(numItems !== undefined && { num_items: numItems }),
    ...((raw.content_name ?? raw.contentName) && {
      content_name: raw.content_name ?? raw.contentName,
    }),
    ...((raw.search_string ?? raw.searchString) && {
      search_string: raw.search_string ?? raw.searchString,
    }),
    ...((raw.order_id ?? raw.orderId) && { order_id: raw.order_id ?? raw.orderId }),
    ...(raw.contentCategory && { content_category: raw.contentCategory }),
  };
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: number }).code === 11000
  );
}

function buildUserData(ud: MetaUserData) {
  const em = hashMetaPii(ud.email, 'email');
  const ph = hashMetaPii(ud.phone, 'phone');
  const fn = hashMetaPii(ud.firstName, 'first_name');
  const ln = hashMetaPii(ud.lastName, 'last_name');
  const ct = hashMetaPii(ud.city, 'city');
  const st = hashMetaPii(ud.state, 'state');
  const zp = hashMetaPii(ud.zip, 'zip_code');
  const db = hashMetaPii(formatMetaDateOfBirth(ud.dateOfBirth), 'date_of_birth');
  const ge = hashMetaPii(ud.gender, 'gender');
  const country = hashMetaPii(ud.country, 'country');
  const externalId = hashMetaPii(ud.externalId, 'external_id');
  const ip = sanitizeMetaClientIp(ud.ipAddress);
  const userAgent = ud.userAgent?.trim();
  const fbp = sanitizeMetaClickId(ud.fbp);
  const fbc = sanitizeMetaClickId(ud.fbc);

  return {
    ...(em && { em }),
    ...(ph && { ph }),
    ...(fn && { fn }),
    ...(ln && { ln }),
    ...(ct && { ct }),
    ...(st && { st }),
    ...(zp && { zp }),
    ...(db && { db }),
    ...(ge && { ge }),
    ...(country && { country }),
    ...(ip && { client_ip_address: ip }),
    ...(userAgent && { client_user_agent: userAgent }),
    ...(fbp && { fbp }),
    ...(fbc && { fbc }),
    ...(externalId && { external_id: externalId }),
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

  async sendEvent(input: MetaEventInput): Promise<MetaCapiResponse> {
    if (!this.configured) {
      logger.debug({ event: input.eventName }, 'Meta CAPI: not configured, skipping');
      return {};
    }

    const eventId = input.eventId ?? randomUUID();
    const eventTime = Math.floor(Date.now() / 1000);

    const customData = normalizeCustomData(input.customData);
    const userData = input.userData ? buildUserData(input.userData) : undefined;

    const payload: Record<string, unknown> = {
      data: [
        {
          event_name: input.eventName,
          event_time: eventTime,
          event_id: eventId,
          ...(input.eventSourceUrl && { event_source_url: input.eventSourceUrl }),
          ...(input.referrerUrl && { referrer_url: input.referrerUrl }),
          action_source: 'website',
          ...(userData && Object.keys(userData).length > 0 && { user_data: userData }),
          ...(customData && Object.keys(customData).length > 0 && { custom_data: customData }),
        },
      ],
    };

    const testEventCode = input.testEventCode ?? appConfig.analytics.meta.testEventCode;
    if (testEventCode) {
      payload.test_event_code = testEventCode;
    }

    let logDoc;
    try {
      logDoc = await AnalyticsEventLogModel.create({
        provider: 'meta',
        eventName: input.eventName,
        eventId,
        status: 'pending',
        payload,
      });
    } catch (err) {
      if (!isDuplicateKeyError(err)) throw err;

      const existing = await AnalyticsEventLogModel.findOne({
        provider: 'meta',
        eventId,
      });
      if (existing?.status === 'sent') {
        logger.debug(
          { event: input.eventName, eventId },
          'Meta CAPI: duplicate event_id already sent — skipping',
        );
        return parseMetaCapiResponse(existing.payload);
      }
      if (!existing) throw err;
      logDoc = existing;
      logDoc.eventName = input.eventName;
      logDoc.payload = payload;
      logDoc.status = 'pending';
    }

    try {
      const url = `${this.endpoint()}?access_token=${appConfig.analytics.meta.token}`;
      const { data } = await fetchWithRetry<MetaCapiResponse>(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const metaResponse = assertMetaAccepted(data, input.eventName);

      logDoc.status = 'sent';
      logDoc.sentAt = new Date();
      logDoc.payload = payload;
      logDoc.lastError = null;
      await logDoc.save();

      logger.info(
        { event: input.eventName, eventId, fbtrace_id: metaResponse.fbtrace_id },
        'Meta CAPI: event sent',
      );

      return metaResponse;
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
      throw err instanceof Error ? err : new Error(errMsg);
    }
  }

  /** Retry an existing AnalyticsEventLog document (called by the sweep). */
  async retryFromLog(doc: { provider: string; payload: unknown }): Promise<void> {
    if (doc.provider !== 'meta') return;
    if (!this.configured) throw new Error('Meta CAPI not configured');

    const raw = (doc.payload ?? {}) as Record<string, unknown>;
    const { metaResponse: _ignored, ...requestPayload } = raw;
    const eventName =
      Array.isArray(requestPayload.data) &&
      requestPayload.data[0] &&
      typeof requestPayload.data[0] === 'object' &&
      'event_name' in requestPayload.data[0]
        ? String((requestPayload.data[0] as { event_name: string }).event_name)
        : 'event';

    const url = `${this.endpoint()}?access_token=${appConfig.analytics.meta.token}`;
    const { data } = await fetchWithRetry<MetaCapiResponse>(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestPayload),
    });

    assertMetaAccepted(data, eventName);
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
    contents?: MetaContentItem[];
    numItems?: number;
    currency: string;
    value: number;
    userData?: MetaUserData;
    eventId?: string;
    eventSourceUrl?: string;
  }) {
    return this.sendEvent({
      eventName: 'InitiateCheckout',
      eventSourceUrl: data.eventSourceUrl,
      userData: data.userData,
      eventId: data.eventId,
      customData: {
        ...(data.contentIds && { content_ids: data.contentIds }),
        ...(data.contents && { contents: data.contents }),
        content_type: 'product',
        ...(data.numItems !== undefined && { num_items: data.numItems }),
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
    contents?: MetaContentItem[];
    numItems?: number;
    userData?: MetaUserData;
    eventId?: string;
    eventSourceUrl?: string;
  }) {
    return this.sendEvent({
      eventName: 'Purchase',
      eventSourceUrl: data.eventSourceUrl,
      userData: data.userData,
      eventId: data.eventId,
      customData: {
        order_id: data.orderId,
        currency: data.currency,
        value: data.value,
        content_type: 'product',
        ...(data.contentIds && { content_ids: data.contentIds }),
        ...(data.contents && { contents: data.contents }),
        ...(data.numItems !== undefined && { num_items: data.numItems }),
      },
    });
  }

  trackLead(userData?: MetaUserData, eventId?: string) {
    return this.sendEvent({ eventName: 'Lead', userData, eventId });
  }

  trackCompleteRegistration(userData?: MetaUserData, eventId?: string, eventSourceUrl?: string) {
    return this.sendEvent({
      eventName: 'CompleteRegistration',
      userData,
      eventId,
      eventSourceUrl,
    });
  }
}

export const metaCapiService = new MetaCapiService();
