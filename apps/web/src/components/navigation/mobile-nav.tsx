import { Link } from '@tanstack/react-router';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import type { NavItem } from '@/components/navigation/main-nav';

export interface MobileNavProps {
  items: NavItem[];
  activeHref?: string;
  transparent?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function MobileNav({ items, activeHref, transparent, open, onOpenChange }: MobileNavProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Open menu"
          className={cn(
            'lg:hidden',
            transparent ? 'text-primary-foreground hover:bg-primary-foreground/10' : undefined,
          )}
        >
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-4/5">
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>
        <Separator />
        <nav aria-label="Mobile" className="flex flex-col gap-1">
          {items.map((item) => {
            const isActive = activeHref === item.href;

            return (
              <Link
                key={item.href}
                to={item.href}
                preload="intent"
                aria-current={isActive ? 'page' : undefined}
                onClick={() => onOpenChange?.(false)}
                className={
                  isActive
                    ? 'bg-accent text-accent-foreground rounded-md px-3 py-2.5 text-sm font-medium'
                    : 'text-foreground hover:bg-muted rounded-md px-3 py-2.5 text-sm font-medium transition-colors'
                }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
