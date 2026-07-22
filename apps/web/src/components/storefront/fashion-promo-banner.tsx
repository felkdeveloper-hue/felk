import { CmsLink } from '@/components/common/cms-link';
import { Image } from '@/components/media/image';
import { cn } from '@/lib/utils';

export interface FashionPromoBannerProps {
  title: string;
  eyebrow?: string;
  ctaLabel?: string;
  href: string;
  imageSrc: string;
  imageAlt: string;
  /** Full viewport height (matches hero / editorial) */
  size?: 'full' | 'half';
  className?: string;
  imageClassName?: string;
}

/**
 * Full-bleed fashion tile. Image stays static on hover.
 * SHOP NOW uses a sharp outline; white fills downward on button hover.
 */
export function FashionPromoBanner({
  title,
  eyebrow,
  ctaLabel = 'Shop Now',
  href,
  imageSrc,
  imageAlt,
  size = 'half',
  className,
  imageClassName,
}: FashionPromoBannerProps) {
  return (
    <CmsLink
      href={href}
      className={cn(
        'relative block overflow-hidden',
        size === 'full' ? 'min-h-[100svh] w-full' : 'min-h-[70svh] w-full sm:min-h-[85svh]',
        className,
      )}
    >
      <Image
        src={imageSrc}
        alt={imageAlt}
        className={cn('absolute inset-0 h-full w-full object-cover', imageClassName)}
        containerClassName="absolute inset-0"
      />

      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-black/20"
      />

      <div className="absolute inset-x-0 bottom-0 z-[1] flex flex-col items-center px-6 pb-14 text-center sm:pb-16 lg:pb-20">
        {eyebrow ? (
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.32em] text-white/85 sm:text-[11px]">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="font-display text-4xl font-bold uppercase leading-[0.92] tracking-[-0.04em] text-white sm:text-5xl lg:text-6xl">
          {title}
        </h2>

        {/* Pill outline CTA — white slides down from the top on hover */}
        <span
          data-radius="pill"
          className={cn(
            'shop-cta group/cta relative mt-6 inline-flex items-center justify-center overflow-hidden',
            'border border-white bg-transparent px-8 py-2.5',
            'text-[11px] font-bold uppercase tracking-[0.2em]',
          )}
        >
          <span
            aria-hidden
            className={cn(
              'pointer-events-none absolute inset-0 origin-top scale-y-0 bg-white',
              'transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)]',
              'group-hover/cta:scale-y-100',
            )}
          />
          <span
            className={cn(
              'relative z-10 text-white',
              'transition-colors duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)]',
              'group-hover/cta:text-zinc-950',
            )}
          >
            {ctaLabel}
          </span>
        </span>
      </div>
    </CmsLink>
  );
}
