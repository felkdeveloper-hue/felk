import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === 'production';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5174,
    host: true,
  },
  preview: {
    port: 5174,
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
