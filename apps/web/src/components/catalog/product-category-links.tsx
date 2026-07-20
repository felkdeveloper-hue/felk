import { ChevronRight } from 'lucide-react';
import type { Product } from '@/services/sdk';

function buildCategoryLinks(product: Product): { label: string; href: string }[] {
  const links: { label: string; href: string }[] = [];
  const tags = product.tags ?? [];

  const fitTag = tags.find((t) => /fit|oversized|slim/i.test(t));
  const colorTag = tags.find((t) => /beige|white|black|blue|red|green/i.test(t));

  if (fitTag) {
    links.push({
      label: `More ${fitTag} T-shirt`,
      href: `/search?q=${encodeURIComponent(fitTag)}`,
    });
  } else {
    links.push({
      label: 'More Oversized Fit T-shirt',
      href: `/search?q=${encodeURIComponent('oversized')}`,
    });
  }

  if (colorTag) {
    links.push({
      label: `More ${colorTag.charAt(0).toUpperCase() + colorTag.slice(1)} T-shirt`,
      href: `/search?q=${encodeURIComponent(colorTag)}`,
    });
  } else {
    links.push({ label: 'More Collection T-shirts', href: '/products' });
  }

  links.push({ label: 'More Collection', href: '/products' });

  return links.slice(0, 3);
}

export function ProductCategoryLinks({ product }: { product: Product }) {
  const links = buildCategoryLinks(product);

  return (
    <div className="space-y-2">
      {links.map((link) => (
        <a
          key={link.label}
          href={link.href}
          className="border-border hover:bg-muted/40 flex items-center justify-between rounded-xl border px-4 py-3.5 text-sm font-medium transition-colors"
        >
          {link.label}
          <ChevronRight className="text-muted-foreground size-4" />
        </a>
      ))}
    </div>
  );
}
