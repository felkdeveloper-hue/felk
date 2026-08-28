import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export interface BlurredBannerImageProps {
  src: string;
  mobileSrc?: string;
  alt?: string;
  className?: string;
  /** Extra object-position classes for the contained foreground image. */
  objectClass?: string;
  loading?: 'eager' | 'lazy';
  fetchPriority?: 'high' | 'low' | 'auto';
  onLoad?: () => void;
}

const MOBILE_MEDIA = '(max-width: 767px)';

/**
 * Wide banner treatment: soft blurred fill of the same image behind a
 * contained foreground so garments are not aggressively cropped.
 */
export function BlurredBannerImage({
  src,
  mobileSrc,
  alt = '',
  className,
  objectClass,
  loading = 'lazy',
  fetchPriority = 'auto',
  onLoad,
}: BlurredBannerImageProps) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
  }, [src, mobileSrc]);

  const handleLoad = () => {
    setLoaded(true);
    onLoad?.();
  };

  return (
    <div className={cn('absolute inset-0 overflow-hidden bg-zinc-900', className)}>
      {/* Soft padded fill — never leave empty white letterbox gaps */}
      <picture aria-hidden>
        {mobileSrc ? <source media={MOBILE_MEDIA} srcSet={mobileSrc} /> : null}
        <img
          src={src}
          alt=""
          aria-hidden
          loading={loading}
          decoding="async"
          className={cn(
            'pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover blur-2xl brightness-[0.55] saturate-[1.05] transition-opacity duration-700',
            loaded ? 'opacity-100' : 'opacity-0',
          )}
        />
      </picture>

      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/40"
      />

      <picture>
        {mobileSrc ? <source media={MOBILE_MEDIA} srcSet={mobileSrc} /> : null}
        <img
          src={src}
          alt={alt}
          loading={loading}
          decoding="async"
          fetchPriority={fetchPriority}
          onLoad={handleLoad}
          className={cn(
            'absolute inset-0 h-full w-full object-contain transition-[opacity,transform] duration-700 ease-out',
            objectClass,
            loaded ? 'scale-100 opacity-100' : 'scale-[1.02] opacity-0',
          )}
        />
      </picture>
    </div>
  );
}
