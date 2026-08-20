const VISITOR_ID_KEY = '_fe_vid';
const VISITOR_COOKIE = '_fe_vid';

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

function persistId(id: string): void {
  try {
    localStorage.setItem(VISITOR_ID_KEY, id);
  } catch {
    /* private mode */
  }
  writeCookie(VISITOR_COOKIE, id, 365);
}

/**
 * Stable visitor ID. Persisted in a first-party cookie + localStorage.
 */
export function getVisitorId(): string {
  try {
    const fromCookie = readCookie(VISITOR_COOKIE);
    if (fromCookie) {
      persistId(fromCookie);
      return fromCookie;
    }
    const stored = localStorage.getItem(VISITOR_ID_KEY);
    if (stored) {
      persistId(stored);
      return stored;
    }
    const id = crypto.randomUUID();
    persistId(id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}
