import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Image } from '@/components/media/image';
import { cn } from '@/lib/utils';
import type { ProductMedia } from '@/services/sdk';

export interface ProductGalleryProps {
  media: ProductMedia[];
  productName: string;
  className?: string;
}

export function ProductGallery({ media, productName, className }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const active = media[activeIndex] ?? media[0];

  if (!active) {
    return <div className={cn('bg-muted aspect-[3/4] rounded-[1.75rem]', className)} />;
  }

  return (
    <div className={cn('lg:sticky lg:top-28 lg:self-start', className)}>
      <div className="space-y-4">
        <div
          className="bg-muted relative cursor-zoom-in overflow-hidden rounded-[1.75rem]"
          onMouseEnter={() => setZoomed(true)}
          onMouseLeave={() => setZoomed(false)}
        >
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
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/35 to-transparent p-4 opacity-0 transition-opacity duration-300 lg:opacity-100">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80">
              Hover to zoom
            </p>
          </div>
        </div>

        {media.length > 1 ? (
          <div className="hide-scrollbar flex gap-3 overflow-x-auto pb-1 lg:grid lg:grid-cols-5 lg:overflow-visible">
            {media.map((item, index) => (
              <button
                key={item.id}
                type="button"
                aria-label={`Show image ${index + 1}`}
                aria-current={index === activeIndex}
                onClick={() => setActiveIndex(index)}
                className={cn(
                  'w-20 shrink-0 overflow-hidden rounded-2xl border-2 transition-all lg:w-auto',
                  index === activeIndex
                    ? 'border-foreground shadow-[var(--shadow-soft)]'
                    : 'border-transparent opacity-80 hover:opacity-100',
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
  );
}
