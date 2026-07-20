import { BadgeCheck, ShieldCheck, RefreshCcw } from 'lucide-react';

const TRUST_ITEMS = [
  { icon: BadgeCheck, label: '100% Genuine Product' },
  { icon: ShieldCheck, label: '100% Secure Payment' },
  { icon: RefreshCcw, label: 'Easy Returns & Instant Refunds' },
] as const;

export function ProductTrustBadges() {
  return (
    <div className="grid grid-cols-3 gap-4 border-t pt-8 text-center">
      {TRUST_ITEMS.map((item) => (
        <div key={item.label} className="space-y-2">
          <item.icon className="mx-auto size-8 text-amber-500" />
          <p className="text-[10px] font-semibold uppercase leading-snug tracking-wide">
            {item.label}
          </p>
        </div>
      ))}
    </div>
  );
}
