import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === 'production';

function r2PublicOrigin(): string {
  const cdn = process.env.VITE_CDN_URL || 'https://pub-3ea3125fe4db4405b6fce21ead15fc1f.r2.dev';
  try {
    const url = new URL(cdn);
    if (url.hostname.endsWith('.r2.dev')) return url.origin;
  } catch {
    /* ignore */
  }
  return 'https://pub-3ea3125fe4db4405b6fce21ead15fc1f.r2.dev';
}

const cdnProxy = {
  '/cdn': {
    target: r2PublicOrigin(),
    changeOrigin: true,
    rewrite: (proxyPath: string) => proxyPath.replace(/^\/cdn/, ''),
  },
  '/api': {
    target: 'http://127.0.0.1:4000',
    changeOrigin: true,
  },
};

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // PWA workbox is production-only — loading it in `vite` slows cold start/HMR.
    ...(isProduction
      ? [
          VitePWA({
            registerType: 'autoUpdate',
            includeAssets: [
              'favicon.svg',
              'favicon-32.png',
              'favicon-48.png',
              'apple-touch-icon.png',
              'icon-192.png',
              'icon-512.png',
              'og-image.svg',
              'og-image.png',
              'manifest.webmanifest',
              'offline.html',
              'robots.txt',
              'sitemap.xml',
            ],
            manifest: false,
            workbox: {
              navigateFallback: '/index.html',
              navigateFallbackDenylist: [/^\/api\//, /^\/cdn\//],
              globPatterns: ['**/*.{js,css,html,ico,svg,webmanifest,woff2}'],
              runtimeCaching: [
                {
                  urlPattern: ({ request }) => request.destination === 'document',
                  handler: 'NetworkFirst',
                  options: {
                    cacheName: 'html-cache',
                    networkTimeoutSeconds: 5,
                  },
                },
                {
                  urlPattern: ({ request }) =>
                    ['style', 'script', 'worker'].includes(request.destination),
                  handler: 'StaleWhileRevalidate',
                  options: { cacheName: 'static-resources' },
                },
              ],
            },
            devOptions: { enabled: false },
          }),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
    // Allow ngrok (and similar) tunnels — free URLs change each session
    allowedHosts: ['.ngrok-free.dev', '.ngrok-free.app', '.ngrok.app', '.ngrok.io'],
    proxy: { ...cdnProxy },
    watch: {
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**',
        '**/.turbo/**',
        '**/apps/api/**',
        '**/coverage/**',
      ],
    },
    warmup: {
      clientFiles: ['./src/main.tsx', './src/App.tsx', './src/routes/**/*.{ts,tsx}'],
    },
  },
  preview: {
    port: 5173,
    proxy: {
      ...cdnProxy,
    },
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      '@tanstack/react-query',
      '@tanstack/react-router',
      'axios',
      'framer-motion',
      'lucide-react',
      'recharts',
      'zod',
      'zustand',
      'socket.io-client',
      'clsx',
      'tailwind-merge',
      'class-variance-authority',
      'sonner',
      'next-themes',
    ],
  },
  build: {
    sourcemap: process.env.VITE_SOURCEMAP === 'true',
    target: 'es2022',
    chunkSizeWarningLimit: 900,
    // Avoid custom manualChunks that split React from its consumers —
    // that caused blank production pages (createContext/forwardRef undefined).
  },
  esbuild: {
    drop: isProduction ? ['console', 'debugger'] : [],
  },
});
