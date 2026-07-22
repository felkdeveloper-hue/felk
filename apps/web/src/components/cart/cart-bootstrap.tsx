import { useEffect, useState } from 'react';
import { useCartBootstrap } from '@/hooks/cart';

/**
 * Loads cart after first paint / idle so it does not compete with
 * product rails and above-the-fold assets on cold starts.
 */
export function CartBootstrap() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const enable = () => {
      if (!cancelled) setReady(true);
    };

    const idle = (
      window as Window & {
        requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
        cancelIdleCallback?: (id: number) => void;
      }
    ).requestIdleCallback;

    if (typeof idle === 'function') {
      const id = idle(enable, { timeout: 2500 });
      return () => {
        cancelled = true;
        (window as Window & { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback?.(id);
      };
    }

    const timer = globalThis.setTimeout(enable, 1200);
    return () => {
      cancelled = true;
      globalThis.clearTimeout(timer);
    };
  }, []);

  if (!ready) return null;
  return <CartBootstrapInner />;
}

function CartBootstrapInner() {
  useCartBootstrap();
  return null;
}
