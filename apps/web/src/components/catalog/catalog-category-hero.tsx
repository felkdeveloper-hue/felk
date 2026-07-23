import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/** Curated fallback images keyed by gender or category slug. */
const HERO_FALLBACKS: Record<string, string> = {
  women: '/catalog/women/women-08.jpg',
  men: '/catalog/women/women-14.jpg',
  accessories: '/catalog/categories/bags.png',
  bags: '/catalog/categories/bags.png',
  'bags-wallets': '/catalog/categories/bags.png',
  hoodies: '/catalog/categories/hoodies.png',
  jackets: '/catalog/categories/jackets.png',
  jeans: '/catalog/categories/jeans.png',
  'new-arrivals': '/catalog/categories/new-arrivals.png',
  oversized: '/catalog/categories/oversized.png',
  shoes: '/catalog/categories/shoes.png',
  corset: '/catalog/categories/corset.png',
};

/** One sentence taglines per scope. */
const TAGLINES: Record<string, string> = {
  women: 'Essential layering · Minimal silhouettes that still make an entrance.',
  men: 'Clean cuts · Considered materials for the modern wardrobe.',
  accessories: 'Finish the look — bags, belts, and details that matter.',
  bags: 'Carry less. Choose better.',
  hoodies: 'Relaxed. Refined. Ready.',
  jackets: 'Outerwear worth keeping.',
  jeans: 'The right fit for every occasion.',
  shoes: 'Step out with intention.',
  oversized: 'Comfort without compromise.',
};

export interface CatalogCategoryHeroProps {
  title: string;
  /** Slug or gender key used to pick the curated fallback. */
  scopeKey?: string;
  /** CMS-supplied image URL — takes priority over fallback. */
  imageUrl?: string | null;
  /** Short tagline. Auto-resolved from scopeKey when omitted. */
  tagline?: string;
  className?: string;
}

export function CatalogCategoryHero({
  title,
  scopeKey,
  imageUrl,
  tagline,
  className,
}: CatalogCategoryHeroProps) {
  const src =
    imageUrl ??
    (scopeKey ? (HERO_FALLBACKS[scopeKey] ?? HERO_FALLBACKS['women']) : HERO_FALLBACKS['women']);
  const resolvedTagline = tagline ?? (scopeKey ? TAGLINES[scopeKey] : undefined);

  const [loaded, setLoaded] = useState(false);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  /* Reveal text on mount with a slight delay so it feels intentional. */
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <section
      ref={ref}
      aria-label={`${title} banner`}
      className={cn('relative h-[38vw] max-h-96 min-h-52 w-full overflow-hidden', className)}
    >
      {/* Background image */}
      <img
        src={src}
        alt=""
        aria-hidden
        loading="eager"
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={cn(
          'duration-1200 absolute inset-0 h-full w-full object-cover transition-[opacity,transform] ease-out',
          loaded ? 'scale-100 opacity-100' : 'scale-[1.03] opacity-0',
        )}
      />

      {/* Gradient overlay — bottom-heavy so products below still read clean */}
      <div className="bg-linear-to-b absolute inset-0 from-black/50 via-black/30 to-black/70" />

      {/* Text block — centred, minimal */}
      <div
        className={cn(
          'absolute inset-0 flex flex-col items-center justify-end pb-10 text-white transition-[opacity,transform] duration-700 ease-out sm:pb-14',
          visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
        )}
      >
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/65">
          FE Collection
        </p>
        <h1 className="font-display text-5xl font-bold uppercase leading-none tracking-[-0.03em] sm:text-7xl">
          {title}
        </h1>
        {resolvedTagline ? (
          <p className="mt-4 max-w-md px-6 text-center text-xs tracking-wider text-white/60 sm:text-sm">
            {resolvedTagline}
          </p>
        ) : null}
      </div>
    </section>
  );
}
