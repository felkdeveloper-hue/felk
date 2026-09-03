import { cn } from '@/lib/utils';

/** Centered home rail heading — subtitle + title + short underline (Best Seller / New Arrivals). */
export function HomeRailHeading({
  subtitle,
  title,
  className,
}: {
  subtitle: string;
  title: string;
  className?: string;
}) {
  return (
    <div
      className={cn('mx-auto max-w-[1680px] px-4 text-center sm:px-6 lg:px-8 xl:px-10', className)}
    >
      <p className="text-foreground text-[13px] font-normal tracking-normal sm:text-sm">
        {subtitle}
      </p>
      <h2 className="text-foreground mt-1.5 text-[1.65rem] font-semibold uppercase tracking-[0.14em] sm:text-3xl sm:tracking-[0.12em]">
        {title}
      </h2>
      <div className="bg-foreground mx-auto mt-2.5 h-px w-11 sm:mt-3 sm:w-14" aria-hidden />
    </div>
  );
}
