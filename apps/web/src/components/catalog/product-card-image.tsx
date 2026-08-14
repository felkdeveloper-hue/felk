import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { ImageOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

/** Card image frame — 4:5. Typical desktop catalog card is ~315 × 394 px. */
export const PRODUCT_CARD_IMAGE_ASPECT = 'aspect-[4/5]';
export const PRODUCT_CARD_IMAGE_RATIO = 4 / 5;
const DEFAULT_FRAME = '#f3f3f3';
const SHORT_IMAGE_FALLBACK = '#ffffff';

type ImageFit = {
  objectFit: 'cover' | 'contain';
  objectPosition: string;
  shortImage: boolean;
  frameColor: string;
};

function resolveProductCardImageFit(naturalWidth: number, naturalHeight: number): ImageFit {
  if (naturalWidth <= 0 || naturalHeight <= 0) {
    return {
      objectFit: 'cover',
      objectPosition: 'center center',
      shortImage: false,
      frameColor: DEFAULT_FRAME,
    };
  }

  const imageRatio = naturalWidth / naturalHeight;

  // Tall / portrait uploads (model on hanger, full-length dress).
  if (imageRatio < PRODUCT_CARD_IMAGE_RATIO * 0.9) {
    return {
      objectFit: 'cover',
      objectPosition: 'center 22%',
      shortImage: false,
      frameColor: DEFAULT_FRAME,
    };
  }

  // Wide / short uploads (shoes, bags) — keep the full product and pad with
  // the photo's own background so the frame looks like one continuous image.
  if (imageRatio > PRODUCT_CARD_IMAGE_RATIO * 1.08) {
    return {
      objectFit: 'contain',
      objectPosition: 'center center',
      shortImage: true,
      frameColor: SHORT_IMAGE_FALLBACK,
    };
  }

  return {
    objectFit: 'cover',
    objectPosition: 'center center',
    shortImage: false,
    frameColor: DEFAULT_FRAME,
  };
}

/** Sample edge pixels so padded cards match the uploaded photo background. */
function sampleImageEdgeColor(image: HTMLImageElement): string | null {
  try {
    const sample = 8;
    const canvas = document.createElement('canvas');
    canvas.width = sample;
    canvas.height = sample;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(image, 0, 0, sample, sample);
    const { data } = ctx.getImageData(0, 0, sample, sample);
    const points = [
      [0, 0],
      [sample - 1, 0],
      [0, sample - 1],
      [sample - 1, sample - 1],
      [Math.floor(sample / 2), 0],
      [Math.floor(sample / 2), sample - 1],
    ];
    let r = 0;
    let g = 0;
    let b = 0;
    for (const [x, y] of points) {
      const i = (y * sample + x) * 4;
      r += data[i] ?? 255;
      g += data[i + 1] ?? 255;
      b += data[i + 2] ?? 255;
    }
    const n = points.length;
    return `rgb(${Math.round(r / n)}, ${Math.round(g / n)}, ${Math.round(b / n)})`;
  } catch {
    return null;
  }
}

export interface ProductCardImageProps {
  src?: string;
  alt: string;
  sizes?: string;
  loading?: 'eager' | 'lazy';
  fetchPriority?: 'high' | 'low' | 'auto';
  className?: string;
  containerClassName?: string;
  /** When true, stretch to the parent box (e.g. hover overlay). */
  fillContainer?: boolean;
  onLoad?: () => void;
  onError?: () => void;
}

export function ProductCardImage({
  src,
  alt,
  sizes,
  loading = 'lazy',
  fetchPriority = 'auto',
  className,
  containerClassName,
  fillContainer = false,
  onLoad,
  onError,
}: ProductCardImageProps) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [fit, setFit] = useState<ImageFit>({
    objectFit: 'cover',
    objectPosition: 'center center',
    shortImage: false,
    frameColor: DEFAULT_FRAME,
  });

  const applyFit = useCallback((node: HTMLImageElement | null) => {
    if (!node || node.naturalWidth <= 0 || node.naturalHeight <= 0) return;
    const next = resolveProductCardImageFit(node.naturalWidth, node.naturalHeight);
    if (next.shortImage) {
      next.frameColor = sampleImageEdgeColor(node) ?? SHORT_IMAGE_FALLBACK;
    }
    setFit(next);
  }, []);

  useLayoutEffect(() => {
    setStatus('loading');
    setFit({
      objectFit: 'cover',
      objectPosition: 'center center',
      shortImage: false,
      frameColor: DEFAULT_FRAME,
    });
    const node = imgRef.current;
    if (node?.complete && node.naturalWidth > 0) {
      applyFit(node);
      setStatus('loaded');
    }
  }, [src, applyFit]);

  const handleLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    applyFit(event.currentTarget);
    setStatus('loaded');
    onLoad?.();
  };

  return (
    <div
      data-slot="product-card-image"
      className={cn(
        'relative overflow-hidden',
        fillContainer ? 'size-full' : PRODUCT_CARD_IMAGE_ASPECT,
        containerClassName,
      )}
      style={{ backgroundColor: fit.frameColor }}
    >
      {status === 'loading' ? <Skeleton className="absolute inset-0 rounded-none" /> : null}

      {!src || status === 'error' ? (
        status === 'error' ? (
          <div className="text-muted-foreground absolute inset-0 flex items-center justify-center">
            <ImageOff className="size-6" />
          </div>
        ) : null
      ) : (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          sizes={sizes}
          loading={loading}
          decoding="async"
          fetchPriority={fetchPriority}
          draggable={false}
          className={cn(
            'size-full transition-opacity duration-300',
            status === 'loaded' ? 'opacity-100' : 'opacity-0',
            className,
          )}
          style={{
            objectFit: fit.objectFit,
            objectPosition: fit.objectPosition,
          }}
          onLoad={handleLoad}
          onError={() => {
            setStatus('error');
            onError?.();
          }}
        />
      )}
    </div>
  );
}
