import { Seo } from '@/components/common/seo';
import { Container } from '@/components/layout/container';
import { CartPageContent } from '@/components/cart';

export function CartPage() {
  return (
    <>
      <Seo title="Cart" description="Review items in your shopping cart." noIndex />
      <Container className="py-10 sm:py-14">
        <header className="mb-10 space-y-2">
          <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-[0.22em]">
            Bag
          </p>
          <h1 className="font-display text-4xl font-bold uppercase tracking-tight sm:text-6xl">
            Shopping cart
          </h1>
          <p className="text-muted-foreground text-sm">
            Review items, promotions, and totals before checkout.
          </p>
        </header>
        <CartPageContent />
      </Container>
    </>
  );
}
