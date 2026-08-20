const ATTR_COOKIE = '_fe_attr';
const ATTR_STORAGE_KEY = '_fe_utm';
const ATTR_MAX_AGE_DAYS = 90;

export type AttributionSnapshot = {
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmTerm?: string | null;
  utmContent?: string | null;
  referrer?: string | null;
  landingPath?: string | null;
  fbclid?: string | null;
  gclid?: string | null;
  ttclid?: string | null;
  msclkid?: string | null;
  igshid?: string | null;
  inAppSource?: string | null;
  capturedAt?: string | null;
};

export function detectInAppSource(ua?: string | null): string | null {
  if (!ua) return null;
  if (/Instagram/i.test(ua)) return 'instagram';
  if (/FBAN|FBAV|FB_IAB|FB4A|FBIOS/i.test(ua)) return 'facebook';
  if (/TikTok|BytedanceWebview|musical_ly/i.test(ua)) return 'tiktok';
  return null;
}

const IGNORED_REFERRER_HOSTS = [
  /mintpay\.lk/i,
  /payhere\.lk/i,
  /paykoko\.com/i,
  /\bkoko\.lk\b/i,
  /paypal\.com/i,
  /stripe\.com/i,
  /checkout\.stripe\.com/i,
  /webxpay\.com/i,
  /genie\.lk/i,
  /fe\.lk$/i,
  /vercel\.com/i,
  /vercel\.app/i,
];

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string, days: number): void {
  if (typeof document === 'undefined') return;
  const maxAge = days * 24 * 60 * 60;
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=/; SameSite=Lax${secure}`;
}

function hostFromReferrer(referrer: string | null | undefined): string | null {
  if (!referrer?.trim()) return null;
  try {
    return new URL(referrer).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

function isIgnoredReferrer(referrer: string | null | undefined): boolean {
  const host = hostFromReferrer(referrer);
  if (!host) return false;
  return IGNORED_REFERRER_HOSTS.some((pattern) => pattern.test(host));
}

function isDirectLike(snapshot: AttributionSnapshot | null): boolean {
  if (!snapshot) return true;
  return !hasAcquisitionSignal(snapshot);
}

export function hasAcquisitionSignal(snapshot: AttributionSnapshot): boolean {
  const referrer = snapshot.referrer?.trim() || null;
  const meaningfulReferrer = Boolean(referrer) && !isIgnoredReferrer(referrer);
  return Boolean(
    snapshot.utmSource?.trim() ||
    snapshot.utmMedium?.trim() ||
    snapshot.utmCampaign?.trim() ||
    snapshot.fbclid?.trim() ||
    snapshot.gclid?.trim() ||
    snapshot.ttclid?.trim() ||
    snapshot.msclkid?.trim() ||
    snapshot.igshid?.trim() ||
    meaningfulReferrer,
  );
}

/** First non-direct source wins. Direct / payment returns never overwrite ads. */
export function pickFirstTouch(
  existing: AttributionSnapshot | null,
  incoming: AttributionSnapshot,
): AttributionSnapshot {
  if (!hasAcquisitionSignal(incoming)) return existing ?? incoming;
  if (isDirectLike(existing)) return incoming;
  return existing as AttributionSnapshot;
}

function readFromUrl(): AttributionSnapshot {
  const params = new URLSearchParams(window.location.search);
  const rawReferrer = document.referrer || null;
  const referrer = isIgnoredReferrer(rawReferrer) ? null : rawReferrer;

  return {
    utmSource: params.get('utm_source'),
    utmMedium: params.get('utm_medium'),
    utmCampaign: params.get('utm_campaign'),
    utmTerm: params.get('utm_term'),
    utmContent: params.get('utm_content'),
    fbclid: params.get('fbclid'),
    gclid: params.get('gclid'),
    ttclid: params.get('ttclid'),
    msclkid: params.get('msclkid'),
    igshid: params.get('igshid'),
    inAppSource: detectInAppSource(navigator.userAgent),
    referrer,
    landingPath: window.location.pathname,
    capturedAt: new Date().toISOString(),
  };
}

function parseStored(raw: string | null): AttributionSnapshot | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AttributionSnapshot;
  } catch {
    return null;
  }
}

function persist(snapshot: AttributionSnapshot): void {
  const encoded = JSON.stringify(snapshot);
  try {
    sessionStorage.setItem(ATTR_STORAGE_KEY, encoded);
    localStorage.setItem(ATTR_STORAGE_KEY, encoded);
  } catch {
    /* private mode */
  }
  writeCookie(ATTR_COOKIE, encoded, ATTR_MAX_AGE_DAYS);
}

function loadPersisted(): AttributionSnapshot | null {
  const fromCookie = parseStored(readCookie(ATTR_COOKIE));
  if (fromCookie) return fromCookie;
  try {
    return parseStored(
      localStorage.getItem(ATTR_STORAGE_KEY) ?? sessionStorage.getItem(ATTR_STORAGE_KEY),
    );
  } catch {
    return null;
  }
}

/** Capture landing attribution and keep the first paid/social source for 90 days. */
export function captureAttribution(): AttributionSnapshot {
  if (typeof window === 'undefined') return {};
  const incoming = readFromUrl();
  const existing = loadPersisted();
  const kept = pickFirstTouch(existing, incoming);
  persist(kept);
  return kept;
}

export function getPersistedAttribution(): AttributionSnapshot | null {
  if (typeof window === 'undefined') return null;
  return loadPersisted();
}

/** @deprecated Use captureAttribution — kept so older imports still compile. */
export function captureUtmParams() {
  return captureAttribution();
}

/** @deprecated Use getPersistedAttribution */
export function getPersistedUtm() {
  return getPersistedAttribution();
}
