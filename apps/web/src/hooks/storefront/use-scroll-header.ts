import { useEffect, useState } from 'react';

export interface UseScrollHeaderOptions {
  threshold?: number;
}

/** Tracks whether the page has scrolled past a threshold (for sticky header styling). */
export function useScrollHeader({ threshold = 24 }: UseScrollHeaderOptions = {}) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setIsScrolled(window.scrollY > threshold);
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);

  return isScrolled;
}
