import { useState } from 'react';
import { Copy, Check, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { useFlashSale } from '@/contexts/flash-sale-context';

const DEFAULT_OFFERS = [
  {
    id: 'prepaid5',
    title: 'Get EXTRA 5% OFF on all Prepaid orders above Rs.1299.',
    code: 'PREPAID5',
  },
];

export function ProductOffersSection() {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { isFlashSaleActive } = useFlashSale();

  const copyCode = async (id: string, code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);
      toast.success(`Coupon ${code} copied`);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('Unable to copy code');
    }
  };

  // During an active flash sale, the 20% extra off supersedes the 5% prepaid offer.
  // Show the flash sale notice instead.
  if (isFlashSaleActive) {
    return (
      <section aria-labelledby="product-offers" className="space-y-3">
        <h2
          id="product-offers"
          className="text-[11px] font-semibold uppercase tracking-[0.16em] lg:text-sm lg:normal-case lg:tracking-normal"
        >
          Active offer
        </h2>
        <div
          className="rounded-xl border p-4"
          style={{
            background: 'linear-gradient(135deg, #fff7ed, #fff0dc)',
            borderColor: 'rgba(255,120,0,0.3)',
          }}
        >
          <div className="flex items-start gap-2">
            <span className="mt-0.5 text-base">⚡</span>
            <p className="text-[13px] leading-snug lg:text-sm">
              <span className="font-bold text-orange-700">Flash Sale Active!</span> You already have{' '}
              <span className="font-bold text-red-600">20% extra off</span> on everything. The
              PREPAID5 offer is not stackable during flash sale and will be available once it ends.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="product-offers" className="space-y-3">
      <h2
        id="product-offers"
        className="text-[11px] font-semibold uppercase tracking-[0.16em] lg:text-sm lg:normal-case lg:tracking-normal"
      >
        Save extra with these offers
      </h2>
      <div className="space-y-3">
        {DEFAULT_OFFERS.map((offer) => (
          <div
            key={offer.id}
            className="border-border/70 bg-muted/40 rounded-none border p-4 lg:rounded-xl lg:border-violet-200/80 lg:bg-violet-50/60"
          >
            <div className="flex items-start gap-2">
              <Tag className="text-muted-foreground mt-0.5 size-4 shrink-0 lg:text-violet-600" />
              <p className="text-[13px] leading-snug lg:text-sm">{offer.title}</p>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className="border-border bg-background rounded-lg border px-3 py-1.5 font-mono text-sm font-semibold tracking-wide">
                {offer.code}
              </span>
              <button
                type="button"
                onClick={() => void copyCode(offer.id, offer.code)}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-600 hover:text-teal-700"
              >
                {copiedId === offer.id ? (
                  <>
                    <Check className="size-3.5" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="size-3.5" />
                    Copy code
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
