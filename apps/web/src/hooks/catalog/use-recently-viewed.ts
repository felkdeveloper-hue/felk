import { useCallback, useEffect, useState } from 'react';
import { MAX_RECENTLY_VIEWED, RECENTLY_VIEWED_KEY } from '@/constants/catalog';
import type { Product } from '@/services/sdk';

function readRecentlyViewed(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(RECENTLY_VIEWED_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function useRecentlyViewed(product?: Product | null) {
  const [ids, setIds] = useState<string[]>(() => readRecentlyViewed());

  useEffect(() => {
    if (!product?.id) return;
    setIds((current) => {
      const next = [product.id, ...current.filter((id) => id !== product.id)].slice(
        0,
        MAX_RECENTLY_VIEWED,
      );
      window.localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(next));
      return next;
    });
  }, [product?.id]);

  const clearRecentlyViewed = useCallback(() => {
    window.localStorage.removeItem(RECENTLY_VIEWED_KEY);
    setIds([]);
  }, []);

  return { recentlyViewedIds: ids, clearRecentlyViewed };
}
