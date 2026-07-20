import { Seo } from '@/components/common/seo';
import { Container } from '@/components/layout/container';
import { CartPageContent } from '@/components/cart';
import { selectCartItemCount, useCartStore } from '@/store/cart-store';

export function CartPage() {
  const cartCount = useCartStore(selectCartItemCount);
  const itemLabel = cartCount === 1 ? '1 Item' : `${cartCount} Items`;

  return (
    <>
      <Seo title="My Bag" description="Review items in your shopping bag." noIndex />
      <Container className="py-8 sm:py-12">
        <header className="mb-8">
          <h1 className="font-display text-3xl font-bold uppercase tracking-tight sm:text-4xl">
            My Bag{cartCount > 0 ? ` (${itemLabel})` : ''}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Review items and totals before checkout.
          </p>
        </header>
        <CartPageContent />
      </Container>
    </>
  );
}
