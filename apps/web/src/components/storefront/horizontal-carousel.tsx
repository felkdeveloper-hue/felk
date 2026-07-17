import { Children, useRef, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface HorizontalCarouselProps {
  children: ReactNode;
  className?: string;
  itemClassName?: string;
  label?: string;
}

/** Touch-friendly horizontal scroller with optional desktop arrow controls. */
export function HorizontalCarousel({
  children,
  className,
  itemClassName,
  label = 'Carousel',
}: HorizontalCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const items = Children.toArray(children);

  const scrollBy = (direction: -1 | 1) => {
    const node = scrollerRef.current;
    if (!node) return;
    const amount = Math.max(node.clientWidth * 0.72, 240);
    node.scrollBy({ left: amount * direction, behavior: 'smooth' });
  };

  return (
    <div className={cn('group/carousel relative', className)} aria-label={label}>
      <div
        ref={scrollerRef}
        className="hide-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pb-2 sm:gap-5 sm:px-6 md:px-8 lg:px-10 xl:px-14 2xl:px-20"
      >
        {items.map((child, index) => (
          <div
            key={index}
            className={cn(
              'w-[68%] shrink-0 snap-start sm:w-[40%] lg:w-[24%] xl:w-[20%] 2xl:w-[16%]',
              itemClassName,
            )}
          >
            {child}
          </div>
        ))}
      </div>

      <div className="pointer-events-none absolute inset-y-0 left-3 right-3 hidden items-center justify-between md:flex">
        <Button
          type="button"
          size="icon"
          variant="secondary"
          aria-label="Previous"
          className="border-border/70 bg-card/90 pointer-events-auto size-11 rounded-full border opacity-0 shadow-[var(--shadow-soft)] backdrop-blur transition-opacity group-hover/carousel:opacity-100"
          onClick={() => scrollBy(-1)}
        >
          <ChevronLeft />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="secondary"
          aria-label="Next"
          className="border-border/70 bg-card/90 pointer-events-auto size-11 rounded-full border opacity-0 shadow-[var(--shadow-soft)] backdrop-blur transition-opacity group-hover/carousel:opacity-100"
          onClick={() => scrollBy(1)}
        >
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}
