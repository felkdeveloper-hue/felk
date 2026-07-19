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

export const env = {
  apiUrl: resolveApiUrl(import.meta.env.VITE_API_URL, 'http://localhost:4000/api/v1'),
  appName: import.meta.env.VITE_APP_NAME ?? 'FE Platform Admin',
  socketUrl: import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:4000',
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
} as const;
