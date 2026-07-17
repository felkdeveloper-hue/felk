import { Gift, Tag } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function CartPromotionsPanel() {
  return (
    <section className="border-border space-y-4 rounded-xl border border-dashed p-5">
      <h2 className="text-sm font-medium">Promotions</h2>

      <Alert>
        <Tag className="size-4" aria-hidden />
        <AlertDescription className="text-xs">
          Promotion codes will be applied at checkout once the promotions service is connected.
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <label htmlFor="coupon-code" className="text-muted-foreground text-sm">
          Coupon code
        </label>
        <div className="flex gap-2">
          <Input id="coupon-code" placeholder="Enter coupon" disabled />
          <Button type="button" variant="outline" disabled>
            Apply
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="gift-card" className="text-muted-foreground text-sm">
          Gift card
        </label>
        <div className="flex gap-2">
          <Input id="gift-card" placeholder="Gift card number" disabled />
          <Button type="button" variant="outline" disabled>
            <Gift className="size-4" aria-hidden />
            Redeem
          </Button>
        </div>
      </div>
    </section>
  );
}
