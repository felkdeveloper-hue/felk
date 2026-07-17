export const env = {
  apiUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api/v1',
  appName: import.meta.env.VITE_APP_NAME ?? 'FE Platform Admin',
  socketUrl: import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:4000',
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
} as const;
