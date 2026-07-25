/** Ensures absolute API hosts include `/api/v1` (common Vercel misconfig). */
function resolveApiUrl(raw: string | undefined, fallback: string): string {
  const value = (raw ?? '').trim() || fallback;
  if (value.startsWith('/')) return value.replace(/\/+$/, '') || '/api/v1';
  try {
    const url = new URL(value);
    const path = url.pathname.replace(/\/+$/, '');
    if (!path || path === '/') {
      url.pathname = '/api/v1';
      return url.toString().replace(/\/+$/, '');
    }
    return `${url.origin}${path}`;
  } catch {
    return value;
  }
}

const defaultApiUrl = import.meta.env.PROD ? 'https://felk-mq41.onrender.com/api/v1' : '/api/v1';

const apiUrl = resolveApiUrl(import.meta.env.VITE_API_URL, defaultApiUrl);

/** Scheme + host of the API (no `/api/v1`), used to serve locally-uploaded `/uploads/...` media. */
function resolveApiOrigin(value: string): string {
  try {
    return new URL(value).origin;
  } catch {
    return '';
  }
}

export const env = {
  apiUrl,
  apiOrigin: resolveApiOrigin(apiUrl),
  appName: import.meta.env.VITE_APP_NAME || 'FE',
  cdnUrl: import.meta.env.VITE_CDN_URL ?? '',
  socketUrl: import.meta.env.VITE_SOCKET_URL ?? '',
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
} as const;
