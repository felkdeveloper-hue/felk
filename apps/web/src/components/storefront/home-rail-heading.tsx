import { Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import { ROUTES } from '@/constants';
import { cn } from '@/lib/utils';

type CollectionHref = typeof ROUTES.bestSellers | typeof ROUTES.newArrivals;

/** Centered home rail heading — subtitle + title + short underline (Best Seller / New Arrivals). */
export function HomeRailHeading({
  subtitle,
  title,
  href,
  className,
}: {
  subtitle: string;
  title: string;
  href: CollectionHref;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'relative mx-auto max-w-[1680px] px-4 text-center sm:px-6 lg:px-8 xl:px-10',
        className,
      )}
    >
      <Link
        to={href}
        className="hover:text-foreground/80 mx-auto block w-fit text-inherit transition-colors"
      >
        <p className="text-foreground text-[13px] font-normal tracking-normal sm:text-sm">
          {subtitle}
        </p>
        <h2 className="text-foreground mt-1.5 text-[1.65rem] font-semibold uppercase tracking-[0.14em] sm:text-3xl sm:tracking-[0.12em]">
          {title}
        </h2>
        <div className="bg-foreground mx-auto mt-2.5 h-px w-11 sm:mt-3 sm:w-14" aria-hidden />
      </Link>
      <Link
        to={href}
        className="text-foreground/70 hover:text-foreground mt-3 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.16em] sm:absolute sm:right-6 sm:top-1/2 sm:mt-0 sm:-translate-y-1/2 lg:right-8 xl:right-10"
      >
        View more
        <ArrowRight className="size-3.5" />
      </Link>
    </div>
  );
}
