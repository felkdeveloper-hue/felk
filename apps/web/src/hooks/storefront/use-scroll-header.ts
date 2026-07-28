import { useEffect, useRef, useState } from 'react';

export interface UseScrollHeaderOptions {
  threshold?: number;
  /** Hide header when scrolling down (mobile chrome). Desktop ignores this. */
  hideOnScrollDown?: boolean;
}

/** Tracks scroll past a threshold and optional hide-on-scroll-down for mobile headers. */
export function useScrollHeader({
  threshold = 24,
  hideOnScrollDown = false,
}: UseScrollHeaderOptions = {}) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    lastY.current = window.scrollY;

    const onScroll = () => {
      const y = window.scrollY;
      setIsScrolled(y > threshold);

      if (hideOnScrollDown) {
        const delta = y - lastY.current;
        if (y < threshold) {
          setIsHidden(false);
        } else if (delta > 8) {
          setIsHidden(true);
        } else if (delta < -8) {
          setIsHidden(false);
        }
      }

      lastY.current = y;
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold, hideOnScrollDown]);

  return { isScrolled, isHidden };
}
