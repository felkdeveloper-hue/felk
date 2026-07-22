import { useEffect, useRef, useState } from 'react';

/**
 * True once the element enters (or is near) the viewport.
 * Used to defer below-fold product rails so the page does not
 * fetch every banner/product list on first paint.
 */
export function useInView<T extends Element = HTMLDivElement>(options?: {
  rootMargin?: string;
  once?: boolean;
  /** Start enabled immediately (above-the-fold sections). */
  immediate?: boolean;
}) {
  const { rootMargin = '240px 0px', once = true, immediate = false } = options ?? {};
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(immediate);

  useEffect(() => {
    if (immediate || inView) return;
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setInView(true);
        if (once) observer.disconnect();
      },
      { rootMargin },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [immediate, inView, once, rootMargin]);

  return { ref, inView };
}
