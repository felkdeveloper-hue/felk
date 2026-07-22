import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { queryClient } from '@/lib/query-client';
import { prefetchStorefrontBootstrap } from '@/lib/prefetch-storefront-bootstrap';
import { App } from './App';

void prefetchStorefrontBootstrap(queryClient);

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
