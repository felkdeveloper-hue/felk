import { Children, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface HorizontalCarouselProps {
  children: ReactNode;
  className?: string;
  itemClassName?: string;
  label?: string;
  /** Keep arrow controls visible (not only on hover). */
  alwaysShowControls?: boolean;
  /** Show pagination dots under the track. */
  showDots?: boolean;
  /** Scroll by one card width instead of ~72% of the viewport. */
  scrollByItem?: boolean;
}

/** Touch-friendly horizontal scroller with optional desktop arrow controls. */
export function HorizontalCarousel({
  children,
  className,
  itemClassName,
  label = 'Carousel',
  alwaysShowControls = false,
  showDots = false,
  scrollByItem = false,
}: HorizontalCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const items = Children.toArray(children);
  const [activeIndex, setActiveIndex] = useState(0);
  const [pageCount, setPageCount] = useState(1);

  const getFirstCard = (node: HTMLDivElement) =>
    node.querySelector<HTMLElement>('[data-carousel-item]');

  const measure = useCallback(() => {
    const node = scrollerRef.current;
    if (!node) return;

    const first = getFirstCard(node);
    if (!first) {
      setPageCount(1);
      return;
    }

    const itemWidth = first.offsetWidth;
    const gap =
      Number.parseFloat(getComputedStyle(node).columnGap || getComputedStyle(node).gap) || 0;
    const step = itemWidth + gap;
    if (step <= 0) return;

    const maxScroll = Math.max(0, node.scrollWidth - node.clientWidth);
    const pages = Math.max(1, Math.round(maxScroll / step) + 1);
    setPageCount(pages);
    setActiveIndex(Math.min(pages - 1, Math.round(node.scrollLeft / step)));
  }, []);

  useEffect(() => {
    const node = scrollerRef.current;
    if (!node) return;

    measure();

    const onScroll = () => {
      const first = getFirstCard(node);
      if (!first) return;
      const itemWidth = first.offsetWidth;
      const gap =
        Number.parseFloat(getComputedStyle(node).columnGap || getComputedStyle(node).gap) || 0;
      const step = itemWidth + gap;
      if (step <= 0) return;
      setActiveIndex(Math.round(node.scrollLeft / step));
    };

    node.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', measure);
    return () => {
      node.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', measure);
    };
  }, [measure, items.length]);

  const scrollBy = (direction: -1 | 1) => {
    const node = scrollerRef.current;
    if (!node) return;

    if (scrollByItem) {
      const first = getFirstCard(node);
      if (!first) return;
      const gap =
        Number.parseFloat(getComputedStyle(node).columnGap || getComputedStyle(node).gap) || 0;
      const amount = first.offsetWidth + gap;
      node.scrollBy({ left: amount * direction, behavior: 'smooth' });
      return;
    }

    const amount = Math.max(node.clientWidth * 0.72, 240);
    node.scrollBy({ left: amount * direction, behavior: 'smooth' });
  };

  const scrollToPage = (page: number) => {
    const node = scrollerRef.current;
    if (!node) return;
    const first = getFirstCard(node);
    if (!first) return;
    const gap =
      Number.parseFloat(getComputedStyle(node).columnGap || getComputedStyle(node).gap) || 0;
    const step = first.offsetWidth + gap;
    node.scrollTo({ left: step * page, behavior: 'smooth' });
  };

  return (
    <div className={cn('group/carousel relative', className)} aria-label={label}>
      <div
        ref={scrollerRef}
        className="hide-scrollbar flex snap-x snap-mandatory scroll-pl-4 gap-3 overflow-x-auto scroll-smooth pb-2 sm:scroll-pl-5 sm:gap-4 lg:scroll-pl-6"
      >
        {/* Edge spacers — more reliable than padding on overflow flex rows */}
        <div className="w-4 shrink-0 sm:w-5 lg:w-6" aria-hidden />
        {items.map((child, index) => (
          <div
            key={index}
            data-carousel-item
            className={cn(
              'shrink-0 snap-start',
              itemClassName ?? 'w-[82%] sm:w-[48%] md:w-[40%] lg:w-[31%] xl:w-[24%]',
            )}
          >
            {child}
          </div>
        ))}
        <div className="w-4 shrink-0 sm:w-5 lg:w-6" aria-hidden />
      </div>

      <div className="pointer-events-none absolute inset-y-0 left-2 right-2 flex items-center justify-between sm:left-3 sm:right-3 md:left-4 md:right-4 lg:left-6 lg:right-6">
        <Button
          type="button"
          size="icon"
          variant="secondary"
          aria-label="Previous"
          className={cn(
            'border-border/70 bg-card pointer-events-auto size-10 rounded-full border shadow-[var(--shadow-soft)] backdrop-blur transition-opacity sm:size-11',
            alwaysShowControls
              ? 'opacity-100'
              : 'opacity-0 group-hover/carousel:opacity-100 max-md:opacity-100',
          )}
          onClick={() => scrollBy(-1)}
        >
          <ChevronLeft />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="secondary"
          aria-label="Next"
          className={cn(
            'border-border/70 bg-card pointer-events-auto size-10 rounded-full border shadow-[var(--shadow-soft)] backdrop-blur transition-opacity sm:size-11',
            alwaysShowControls
              ? 'opacity-100'
              : 'opacity-0 group-hover/carousel:opacity-100 max-md:opacity-100',
          )}
          onClick={() => scrollBy(1)}
        >
          <ChevronRight />
        </Button>
      </div>

      {showDots && pageCount > 1 ? (
        <div
          className="mt-5 flex items-center justify-center gap-2.5"
          role="tablist"
          aria-label={`${label} pages`}
        >
          {Array.from({ length: pageCount }).map((_, index) => {
            const isActive = index === activeIndex;
            return (
              <button
                key={index}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={`Go to slide ${index + 1}`}
                className={cn(
                  'size-2 rounded-full transition-colors duration-200',
                  isActive ? 'bg-foreground' : 'bg-foreground/25 hover:bg-foreground/45',
                )}
                onClick={() => scrollToPage(index)}
              />
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
