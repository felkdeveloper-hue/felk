import { Link } from '@tanstack/react-router';
import { ROUTES } from '@/constants';
import { Button } from '@/components/ui/button';
import { FreeDeliveryBanner } from '@/components/cart/free-delivery-banner';

export function EmptyBagState({
  title = 'Your bag is empty',
  description = 'Browse the catalog and add pieces you love.',
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="border-border/80 bg-muted/40 mx-auto max-w-6xl rounded-[2rem] border border-dashed px-6 py-20 text-center">
      <h2 className="font-display text-3xl font-bold uppercase">{title}</h2>
      <p className="text-muted-foreground mt-2 text-sm">{description}</p>
      <div className="mx-auto mt-5 max-w-md text-left">
        <FreeDeliveryBanner subtotal={0} />
      </div>
      <Button asChild className="mt-6">
        <Link to={ROUTES.products}>Continue shopping</Link>
      </Button>
    </div>
  );
}
