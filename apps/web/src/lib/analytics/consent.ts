const CONSENT_COOKIE = '_fe_consent';
const CONSENT_STORAGE_KEY = '_fe_consent';
const CONSENT_EVENT = 'fe-consent-changed';

export type CookieConsent = {
  analytics: boolean;
  marketing: boolean;
  decidedAt: string;
};

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

function parseConsent(raw: string | null): CookieConsent | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CookieConsent;
    if (typeof parsed.analytics !== 'boolean' || typeof parsed.marketing !== 'boolean') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function getCookieConsent(): CookieConsent | null {
  if (typeof window === 'undefined') return null;
  const fromCookie = parseConsent(readCookie(CONSENT_COOKIE));
  if (fromCookie) return fromCookie;
  try {
    return parseConsent(localStorage.getItem(CONSENT_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function hasAnalyticsConsent(): boolean {
  // First-party store analytics (source, geo, device) always run so ads are not lost
  // if the banner is ignored. Marketing tools still read this for PostHog/Pixel.
  return getCookieConsent()?.analytics !== false;
}

export function hasMarketingConsent(): boolean {
  return getCookieConsent()?.marketing !== false;
}

export function setCookieConsent(
  next: Pick<CookieConsent, 'analytics' | 'marketing'>,
): CookieConsent {
  const value: CookieConsent = {
    analytics: next.analytics,
    marketing: next.marketing,
    decidedAt: new Date().toISOString(),
  };
  const encoded = JSON.stringify(value);
  writeCookie(CONSENT_COOKIE, encoded, 365);
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, encoded);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(CONSENT_EVENT));
  return value;
}

export function onConsentChange(handler: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  window.addEventListener(CONSENT_EVENT, handler);
  return () => window.removeEventListener(CONSENT_EVENT, handler);
}
