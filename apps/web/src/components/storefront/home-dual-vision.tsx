import { Link } from '@tanstack/react-router';
import { ROUTES } from '@/constants';
import { cn } from '@/lib/utils';

/**
 * Dual Vision editorial block — centered script + stacked headline + CTA.
 * Mobile typography matched to premium DualVision reference; desktop preserved.
 */
export function HomeDualVisionSection() {
  return (
    <section
      aria-label="Dual Vision"
      className="bg-background px-6 py-12 text-center sm:py-14 lg:py-16"
    >
      <p
        className="text-foreground text-[1.65rem] leading-none lg:text-[1.5rem]"
        style={{ fontFamily: '"Great Vibes", "Instrument Serif", cursive' }}
      >
        <span className="lg:hidden">DualVision</span>
        <span className="hidden lg:inline">Dual Vision</span>
      </p>

      <h2
        className={cn(
          'text-foreground mx-auto uppercase',
          // Mobile — IMAGE 2: Syne display, bold, tight three-line stack
          'font-display mt-3 max-w-[17.5rem] text-[clamp(1.85rem,8.2vw,2.35rem)] font-bold leading-[0.98] tracking-[-0.01em]',
          // Desktop — previous treatment
          'lg:mt-6 lg:max-w-none lg:font-sans lg:text-5xl lg:font-extrabold lg:leading-[1.02] lg:tracking-[-0.02em]',
        )}
      >
        Revolving
        <br />
        Stopped
        <br />
        In Both
      </h2>

      <p
        className={cn(
          'mx-auto',
          'text-foreground/60 mt-4 max-w-[17.25rem] text-[12.5px] leading-[1.55]',
          'lg:text-foreground/55 lg:mt-6 lg:max-w-md lg:text-sm lg:leading-relaxed',
        )}
      >
        Explore the collection that shifts between bold statements and quiet confidence crafted for
        the streets, made for your story.
      </p>

      <Link
        to={ROUTES.products}
        search={{ gender: 'women' }}
        preload="intent"
        className={cn(
          'bg-foreground text-background inline-flex items-center justify-center font-bold uppercase transition-opacity hover:opacity-90',
          'mt-6 min-h-[2.65rem] rounded-lg px-9 text-[11.5px] tracking-[0.16em]',
          'lg:mt-8 lg:min-h-11 lg:rounded-md lg:px-8 lg:text-[12px] lg:tracking-[0.14em]',
        )}
      >
        View More
      </Link>
    </section>
  );
}
