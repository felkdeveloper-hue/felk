import * as React from 'react';
import useEmblaCarousel, { type UseEmblaCarouselType } from 'embla-carousel-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

/**
 * `embla-carousel` (the core package) is a transitive dependency resolved
 * only inside `embla-carousel-react`'s own module scope, so its types are
 * derived here rather than imported from `embla-carousel` directly.
 */
type EmblaApi = NonNullable<UseEmblaCarouselType[1]>;
type UseEmblaCarouselParameters = Parameters<typeof useEmblaCarousel>;
type EmblaOptionsType = UseEmblaCarouselParameters[0];
type EmblaPluginsType = UseEmblaCarouselParameters[1];

interface CarouselContextValue {
  carouselRef: ReturnType<typeof useEmblaCarousel>[0];
  api: EmblaApi | undefined;
  orientation: 'horizontal' | 'vertical';
  canScrollPrev: boolean;
  canScrollNext: boolean;
  scrollPrev: () => void;
  scrollNext: () => void;
}

const CarouselContext = React.createContext<CarouselContextValue | null>(null);

function useCarousel() {
  const context = React.useContext(CarouselContext);
  if (!context) {
    throw new Error('Carousel components must be used within <Carousel>');
  }
  return context;
}

export interface CarouselProps extends React.HTMLAttributes<HTMLDivElement> {
  opts?: EmblaOptionsType;
  plugins?: EmblaPluginsType;
  orientation?: 'horizontal' | 'vertical';
  setApi?: (api: EmblaApi | undefined) => void;
}

export const Carousel = React.forwardRef<HTMLDivElement, CarouselProps>(
  ({ orientation = 'horizontal', opts, setApi, plugins, className, children, ...props }, ref) => {
    const [carouselRef, api] = useEmblaCarousel(
      { ...opts, axis: orientation === 'horizontal' ? 'x' : 'y' },
      plugins,
    );
    const [canScrollPrev, setCanScrollPrev] = React.useState(false);
    const [canScrollNext, setCanScrollNext] = React.useState(false);

    const onSelect = React.useCallback((instance: EmblaApi) => {
      setCanScrollPrev(instance.canScrollPrev());
      setCanScrollNext(instance.canScrollNext());
    }, []);

    const scrollPrev = React.useCallback(() => api?.scrollPrev(), [api]);
    const scrollNext = React.useCallback(() => api?.scrollNext(), [api]);

    const handleKeyDown = React.useCallback(
      (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          scrollPrev();
        } else if (event.key === 'ArrowRight') {
          event.preventDefault();
          scrollNext();
        }
      },
      [scrollPrev, scrollNext],
    );

    React.useEffect(() => {
      if (!api) return;
      onSelect(api);
      setApi?.(api);
      api.on('reInit', onSelect);
      api.on('select', onSelect);

      return () => {
        api.off('select', onSelect);
      };
    }, [api, onSelect, setApi]);

    return (
      <CarouselContext.Provider
        value={{
          carouselRef,
          api,
          orientation,
          canScrollPrev,
          canScrollNext,
          scrollPrev,
          scrollNext,
        }}
      >
        <div
          ref={ref}
          onKeyDownCapture={handleKeyDown}
          className={cn('relative', className)}
          role="region"
          aria-roledescription="carousel"
          {...props}
        >
          {children}
        </div>
      </CarouselContext.Provider>
    );
  },
);
Carousel.displayName = 'Carousel';

export const CarouselContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { carouselRef, orientation } = useCarousel();

  return (
    <div ref={carouselRef} className="overflow-hidden">
      <div
        ref={ref}
        className={cn('flex', orientation === 'vertical' ? 'flex-col' : '-ml-4', className)}
        {...props}
      />
    </div>
  );
});
CarouselContent.displayName = 'CarouselContent';

export const CarouselItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const { orientation } = useCarousel();

    return (
      <div
        ref={ref}
        role="group"
        aria-roledescription="slide"
        className={cn(
          'min-w-0 shrink-0 grow-0 basis-full',
          orientation === 'horizontal' ? 'pl-4' : 'pt-4',
          className,
        )}
        {...props}
      />
    );
  },
);
CarouselItem.displayName = 'CarouselItem';

export function CarouselPrevious({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof Button>) {
  const { orientation, scrollPrev, canScrollPrev } = useCarousel();

  return (
    <Button
      variant="outline"
      size="icon"
      className={cn(
        'absolute size-9 rounded-full',
        orientation === 'horizontal'
          ? '-left-4 top-1/2 -translate-y-1/2'
          : '-top-4 left-1/2 -translate-x-1/2 rotate-90',
        className,
      )}
      disabled={!canScrollPrev}
      onClick={scrollPrev}
      {...props}
    >
      <ChevronLeft />
      <span className="sr-only">Previous slide</span>
    </Button>
  );
}

export function CarouselNext({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof Button>) {
  const { orientation, scrollNext, canScrollNext } = useCarousel();

  return (
    <Button
      variant="outline"
      size="icon"
      className={cn(
        'absolute size-9 rounded-full',
        orientation === 'horizontal'
          ? '-right-4 top-1/2 -translate-y-1/2'
          : '-bottom-4 left-1/2 -translate-x-1/2 rotate-90',
        className,
      )}
      disabled={!canScrollNext}
      onClick={scrollNext}
      {...props}
    >
      <ChevronRight />
      <span className="sr-only">Next slide</span>
    </Button>
  );
}

export { useCarousel };
