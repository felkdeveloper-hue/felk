import * as React from 'react';
import { cn } from '@/lib/utils';
import { Image } from '@/components/media/image';

export interface GalleryImage {
  src: string;
  alt: string;
}

export interface GalleryProps {
  images: GalleryImage[];
  className?: string;
}

export function Gallery({ images, className }: GalleryProps) {
  const [activeIndex, setActiveIndex] = React.useState(0);
  const activeImage = images[activeIndex] ?? images[0];

  if (!activeImage) return null;

  return (
    <div className={cn('grid gap-3', className)}>
      <Image
        key={activeImage.src}
        src={activeImage.src}
        alt={activeImage.alt}
        containerClassName="aspect-[3/4] w-full rounded-xl"
      />

      {images.length > 1 ? (
        <div className="grid grid-cols-5 gap-3">
          {images.map((image, index) => (
            <button
              key={image.src}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`View ${image.alt}`}
              aria-current={index === activeIndex}
              className={cn(
                'overflow-hidden rounded-md border-2 transition-colors',
                index === activeIndex ? 'border-primary' : 'border-transparent',
              )}
            >
              <Image src={image.src} alt={image.alt} containerClassName="aspect-square w-full" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
