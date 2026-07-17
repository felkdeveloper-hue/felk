import { Link } from '@tanstack/react-router';
import { Seo } from '@/components/common/seo';
import { Container } from '@/components/layout/container';
import { WishlistPageContent } from '@/components/wishlist';
import { ROUTES } from '@/constants';
import { useAuthStore } from '@/store';
import { Button } from '@/components/ui/button';

export function WishlistPage() {
  const isAuthed = useAuthStore((state) => Boolean(state.accessToken && state.user));

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
          <p className="text-muted-foreground text-sm">Items you have saved for later.</p>
        </header>

        {isAuthed ? (
          <WishlistPageContent />
        ) : (
          <div className="border-border/80 bg-muted/40 rounded-[2rem] border border-dashed px-6 py-20 text-center">
            <h2 className="font-display text-3xl font-bold uppercase">
              Sign in to view your wishlist
            </h2>
            <p className="text-muted-foreground mt-2 text-sm">
              Save your favourite pieces and access them from any device.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button asChild>
                <Link to={ROUTES.authLogin} search={{ redirect: ROUTES.wishlist }}>
                  Sign in
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to={ROUTES.products}>Continue shopping</Link>
              </Button>
            </div>
          </div>
        )}
      </Container>
    </>
  );
}
