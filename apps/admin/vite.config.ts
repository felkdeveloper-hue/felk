import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === 'production';

function manualChunks(id: string): string | undefined {
  if (!id.includes('node_modules')) return undefined;
  if (id.includes('react-dom') || /[/\\]react[/\\]/.test(id)) return 'vendor-react';
  if (id.includes('@tanstack')) return 'vendor-tanstack';
  if (id.includes('framer-motion')) return 'vendor-motion';
  if (id.includes('lucide-react')) return 'vendor-icons';
  return undefined;
}

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
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks,
      },
    },
  },
  esbuild: {
    drop: isProduction ? ['console', 'debugger'] : [],
  },
});
