import { useState } from 'react';
import { Copy, Check, Tag } from 'lucide-react';
import { toast } from 'sonner';

const DEFAULT_OFFERS = [
  {
    id: 'prepaid5',
    title: 'Get EXTRA 5% OFF on all Prepaid orders above Rs.1299.',
    code: 'PREPAID5',
  },
];

export function ProductOffersSection() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  return (
    <section aria-labelledby="product-offers" className="space-y-3">
      <h2 id="product-offers" className="text-sm font-semibold">
        Save extra with these offers
      </h2>
      <div className="space-y-3">
        {DEFAULT_OFFERS.map((offer) => (
          <div
            key={offer.id}
            className="rounded-xl border border-violet-200/80 bg-violet-50/60 p-4"
          >
            <div className="flex items-start gap-2">
              <Tag className="mt-0.5 size-4 shrink-0 text-violet-600" />
              <p className="text-sm leading-snug">{offer.title}</p>
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
