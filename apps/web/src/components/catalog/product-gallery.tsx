import { useState } from 'react';
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
  const active = media[activeIndex] ?? media[0];

  if (!active) {
    return <div className={cn('bg-muted aspect-[3/4] rounded-[1.75rem]', className)} />;
  }

  const goPrev = () => setActiveIndex((index) => (index - 1 + media.length) % media.length);
  const goNext = () => setActiveIndex((index) => (index + 1) % media.length);

  return (
    <div className={cn('lg:sticky lg:top-28 lg:self-start', className)}>
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
                    'overflow-hidden rounded-xl border-2 transition-all',
                    index === activeIndex
                      ? 'border-foreground shadow-[var(--shadow-soft)]'
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
                className="border-border text-muted-foreground hover:bg-muted mx-auto flex size-8 items-center justify-center rounded-full border"
                onClick={() => setActiveIndex((index) => Math.min(index + 1, media.length - 1))}
              >
                <ChevronDown className="size-4" />
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="relative min-w-0 flex-1">
          <div
            className="bg-muted relative cursor-zoom-in overflow-hidden rounded-[1.75rem]"
            onMouseEnter={() => setZoomed(true)}
            onMouseLeave={() => setZoomed(false)}
          >
            {badgeLabel ? (
              <span className="text-foreground absolute left-3 top-3 z-10 rounded bg-amber-100/95 px-2 py-1 text-[10px] font-bold uppercase tracking-wider shadow-sm">
                {badgeLabel}
              </span>
            ) : null}

            <AnimatePresence mode="wait">
              <motion.div
                key={active.url}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.28 }}
              >
                <Image
                  src={active.url}
                  alt={active.alt ?? productName}
                  aspectRatio="3/4"
                  className={cn(
                    'transition-transform duration-700 ease-out',
                    zoomed && 'scale-[1.18]',
                  )}
                />
              </motion.div>
            </AnimatePresence>

            {media.length > 1 ? (
              <>
                <button
                  type="button"
                  aria-label="Previous image"
                  onClick={goPrev}
                  className="bg-background/90 text-foreground absolute left-3 top-1/2 hidden size-9 -translate-y-1/2 items-center justify-center rounded-full shadow-md sm:flex"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label="Next image"
                  onClick={goNext}
                  className="bg-background/90 text-foreground absolute right-3 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full shadow-md"
                >
                  <ChevronRight className="size-4" />
                </button>
              </>
            ) : null}
          </div>

          {media.length > 1 ? (
            <div className="hide-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1 sm:hidden">
              {media.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  aria-label={`Show image ${index + 1}`}
                  aria-current={index === activeIndex}
                  onClick={() => setActiveIndex(index)}
                  className={cn(
                    'w-16 shrink-0 overflow-hidden rounded-xl border-2 transition-all',
                    index === activeIndex ? 'border-foreground' : 'border-transparent opacity-80',
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
