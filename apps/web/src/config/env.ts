export const env = {
  apiUrl: import.meta.env.VITE_API_URL || '/api/v1',
  appName: import.meta.env.VITE_APP_NAME || 'FE',
  cdnUrl: import.meta.env.VITE_CDN_URL ?? '',
  socketUrl: import.meta.env.VITE_SOCKET_URL ?? '',
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
} as const;
