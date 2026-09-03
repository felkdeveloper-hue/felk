import { useLayoutEffect } from 'react';
import { Seo } from '@/components/common/seo';
import { Container } from '@/components/layout/container';
import { WishlistPageContent } from '@/components/wishlist';

function scrollWindowToTop() {
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

export function WishlistPage() {
  // Always open wishlist from the top — menu / bottom-nav navigations often
  // leave the previous product-list scroll offset in place on mobile.
  useLayoutEffect(() => {
    scrollWindowToTop();
    // Re-run after sheet/drawer close animation settles.
    const t1 = window.setTimeout(scrollWindowToTop, 50);
    const t2 = window.setTimeout(scrollWindowToTop, 220);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  return (
    <>
      <Seo title="Wishlist" description="Your saved items." noIndex />
      <Container className="py-6 sm:py-14">
        <header className="mb-6 space-y-1.5 sm:mb-10 sm:space-y-2">
          <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-[0.22em]">
            Saved
          </p>
          <h1 className="font-display text-3xl font-bold uppercase tracking-tight sm:text-6xl">
            Wishlist
          </h1>
          <p className="text-muted-foreground text-sm">
            Items you have saved for later — no account required.
          </p>
        </header>

        <WishlistPageContent />
      </Container>
    </>
  );
}
