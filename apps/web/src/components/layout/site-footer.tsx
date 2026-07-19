import { Facebook, Instagram } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Container } from '@/components/layout/container';
import { Separator } from '@/components/ui/separator';

interface FooterLink {
  label: string;
  href: string;
}

interface FooterColumn {
  title: string;
  links: FooterLink[];
}

const DEFAULT_COLUMNS: FooterColumn[] = [
  {
    title: 'Shop',
    links: [
      { label: 'New Arrivals', href: '/shop?filter=new' },
      { label: 'Best Sellers', href: '/shop?filter=best-sellers' },
      { label: 'Sale', href: '/shop?filter=sale' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'Shipping', href: '/shipping' },
      { label: 'Returns', href: '/returns' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'Contact', href: '/contact' },
      { label: 'Careers', href: '/careers' },
      { label: 'Journal', href: '/journal' },
    ],
  },
];

export interface SiteFooterProps {
  columns?: FooterColumn[];
  className?: string;
}

export function SiteFooter({ columns = DEFAULT_COLUMNS, className }: SiteFooterProps) {
  return (
    <footer data-slot="site-footer" className={cn('border-border bg-card border-t', className)}>
      <Container className="grid gap-12 py-16 sm:grid-cols-2 lg:grid-cols-5">
        <div className="col-span-2 space-y-4 lg:col-span-2">
          <a href="/" className="font-display text-foreground text-2xl tracking-tight">
            FE
          </a>
          <p className="text-muted-foreground max-w-xs text-sm">
            Modern fashion for every day. Trend-driven pieces from Fashion Edge, Kandy.
          </p>
          <div className="flex items-center gap-3 pt-2">
            <a
              href="https://www.instagram.com/fashion__edge__/"
              aria-label="Instagram"
              className="border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground flex size-9 items-center justify-center rounded-full border transition-colors"
            >
              <Instagram className="size-4" />
            </a>
            <a
              href="https://www.facebook.com/fashionedge.lk/"
              aria-label="Facebook"
              className="border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground flex size-9 items-center justify-center rounded-full border transition-colors"
            >
              <Facebook className="size-4" />
            </a>
          </div>
        </div>

        {columns.map((column) => (
          <nav key={column.title} aria-label={column.title} className="space-y-3">
            <p className="text-foreground text-xs font-medium uppercase tracking-[0.15em]">
              {column.title}
            </p>
            <ul className="space-y-2.5">
              {column.links.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </Container>

      <Separator />

      <Container className="text-muted-foreground flex flex-col items-center justify-between gap-2 py-6 text-xs sm:flex-row">
        <p>&copy; {new Date().getFullYear()} FE. All rights reserved.</p>
        <div className="flex items-center gap-4">
          <a href="/privacy" className="hover:text-foreground">
            Privacy
          </a>
          <a href="/terms" className="hover:text-foreground">
            Terms
          </a>
        </div>
      </Container>
    </footer>
  );
}
