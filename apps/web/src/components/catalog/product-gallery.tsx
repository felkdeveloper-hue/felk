import { useRef, useState, type TouchEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Image } from '@/components/media/image';
import { cn } from '@/lib/utils';
import type { ProductMedia } from '@/services/sdk';

export interface ProductGalleryProps {
  media: ProductMedia[];
  productName: string;
  badgeLabel?: string;
  className?: string;
}

export function ProductGallery({ media, productName, badgeLabel, className }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [mobileZoom, setMobileZoom] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const active = media[activeIndex] ?? media[0];

  if (!active) {
    return <div className={cn('bg-muted aspect-[3/4] rounded-none', className)} />;
  }

  const goPrev = () => setActiveIndex((index) => (index - 1 + media.length) % media.length);
  const goNext = () => setActiveIndex((index) => (index + 1) % media.length);

  const onTouchStart = (event: TouchEvent) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  };

  const onTouchEnd = (event: TouchEvent) => {
    const start = touchStartX.current;
    const end = event.changedTouches[0]?.clientX;
    touchStartX.current = null;
    if (start == null || end == null || media.length < 2) return;
    const delta = end - start;
    if (Math.abs(delta) < 48) return;
    if (delta < 0) goNext();
    else goPrev();
  };

  return (
    <div className={cn('lg:sticky lg:top-24 lg:self-start', className)}>
      <div className="flex gap-3 lg:gap-4">
        {media.length > 1 ? (
          <div className="hidden w-[4.5rem] shrink-0 flex-col gap-2 sm:flex lg:w-20">
            <div className="flex max-h-[34rem] flex-col gap-2 overflow-y-auto pr-0.5">
              {media.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  aria-label={`Show image ${index + 1}`}
                  aria-current={index === activeIndex}
                  onClick={() => setActiveIndex(index)}
                  className={cn(
                    'overflow-hidden rounded-none border transition-all',
                    index === activeIndex
                      ? 'border-foreground border-2'
                      : 'border-transparent opacity-75 hover:opacity-100',
                  )}
                >
                  <Image
                    src={item.url}
                    alt={item.alt ?? `${productName} thumbnail ${index + 1}`}
                    aspectRatio="3/4"
                  />
                </button>
              ))}
            </div>
            {media.length > 5 ? (
              <button
                type="button"
                aria-label="Scroll thumbnails"
                className="border-border text-muted-foreground hover:bg-muted mx-auto flex size-8 items-center justify-center rounded-none border"
                onClick={() => setActiveIndex((index) => Math.min(index + 1, media.length - 1))}
              >
                <ChevronDown className="size-4" />
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="relative min-w-0 flex-1">
          <div
            className="bg-muted border-border/80 relative overflow-hidden rounded-none border lg:cursor-zoom-in"
            onMouseEnter={() => setZoomed(true)}
            onMouseLeave={() => setZoomed(false)}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            onClick={() => {
              // Tap-to-zoom on touch devices only (desktop keeps hover zoom)
              if (
                typeof window !== 'undefined' &&
                typeof window.matchMedia === 'function' &&
                window.matchMedia('(hover: none)').matches
              ) {
                setMobileZoom((v) => !v);
              }
            }}
          >
            {badgeLabel ? (
              <span className="bg-background/95 text-foreground absolute left-3 top-3 z-10 rounded-none px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] shadow-sm">
                {badgeLabel}
              </span>
            ) : null}

            <AnimatePresence mode="wait">
              <motion.div
                key={active.url}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Image
                  src={active.url}
                  alt={active.alt ?? productName}
                  aspectRatio="3/4"
                  className={cn(
                    'transition-transform duration-200 ease-out lg:duration-700',
                    zoomed && 'lg:scale-[1.18]',
                    mobileZoom && 'scale-[1.35]',
                  )}
                />
              </motion.div>
            </AnimatePresence>

            {media.length > 1 ? (
              <>
                <button
                  type="button"
                  aria-label="Previous image"
                  onClick={(e) => {
                    e.stopPropagation();
                    goPrev();
                  }}
                  className="bg-background/95 text-foreground border-border absolute left-3 top-1/2 hidden size-9 -translate-y-1/2 items-center justify-center rounded-none border shadow-sm sm:flex"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label="Next image"
                  onClick={(e) => {
                    e.stopPropagation();
                    goNext();
                  }}
                  className="bg-background/95 text-foreground border-border absolute right-3 top-1/2 hidden size-9 -translate-y-1/2 items-center justify-center rounded-none border shadow-sm lg:flex"
                >
                  <ChevronRight className="size-4" />
                </button>

                {/* Mobile image indicator dots */}
                <div
                  className="absolute inset-x-0 bottom-3 z-10 flex justify-center gap-1.5 lg:hidden"
                  aria-hidden
                >
                  {media.map((item, index) => (
                    <span
                      key={item.id}
                      className={cn(
                        'size-1.5 rounded-full transition-colors duration-150',
                        index === activeIndex ? 'bg-foreground' : 'bg-foreground/30',
                      )}
                    />
                  ))}
                </div>
              </>
            ) : null}
          </div>

          {media.length > 1 ? (
            <div className="hide-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1 sm:hidden">
              {media.map((item, index) => (
                <button
                  type="button"
                  key={item.id}
                  aria-label={`Show image ${index + 1}`}
                  aria-current={index === activeIndex}
                  onClick={() => setActiveIndex(index)}
                  className={cn(
                    'w-14 shrink-0 overflow-hidden rounded-none border transition-all',
                    index === activeIndex
                      ? 'border-foreground border-2'
                      : 'border-transparent opacity-80',
                  )}
                >
                  <Image
                    src={item.url}
                    alt={item.alt ?? `${productName} thumbnail ${index + 1}`}
                    aspectRatio="1/1"
                  />
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
