import { Seo } from '@/components/common/seo';
import { Container } from '@/components/layout/container';
import { WishlistPageContent } from '@/components/wishlist';

export function WishlistPage() {
  return (
    <>
      <Seo title="Wishlist" description="Your saved items." noIndex />
      <Container className="py-10 sm:py-14">
        <header className="mb-10 space-y-2">
          <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-[0.22em]">
            Saved
          </p>
          <h1 className="font-display text-4xl font-bold uppercase tracking-tight sm:text-6xl">
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
