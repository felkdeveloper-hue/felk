import { getVisitorId } from '@/lib/analytics/visitor-id';
import { captureAttribution, getPersistedAttribution } from '@/lib/analytics/attribution';

/** Payload sent with guest checkout / auth so the API can attach Source to the user. */
export function getAttributionPayloadForAuth() {
  captureAttribution();
  const attr = getPersistedAttribution() ?? {};
  return {
    visitorId: getVisitorId(),
    utmSource: attr.utmSource ?? null,
    utmMedium: attr.utmMedium ?? null,
    utmCampaign: attr.utmCampaign ?? null,
    utmTerm: attr.utmTerm ?? null,
    utmContent: attr.utmContent ?? null,
    referrer: attr.referrer ?? null,
    fbclid: attr.fbclid ?? null,
    gclid: attr.gclid ?? null,
    ttclid: attr.ttclid ?? null,
    msclkid: attr.msclkid ?? null,
    igshid: attr.igshid ?? null,
    inAppSource: attr.inAppSource ?? null,
    landingPath:
      attr.landingPath ?? (typeof window !== 'undefined' ? window.location.pathname : null),
  };
}
