import { useEffect } from 'react';
import { FeLogo } from '@/components/brand/fe-logo';

interface MaintenanceLayoutProps {
  title?: string;
  description?: string;
}

/** Full-screen lock. No navigation, no shop content. */
export function MaintenanceLayout({
  title = 'Website is Under Maintenance!',
  description = 'Fashion Edge is temporarily unavailable while we update the store. Please check back soon.',
}: MaintenanceLayoutProps) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Website is Under Maintenance | Fashion Edge';

    const existing = document.querySelector('meta[name="robots"]');
    const robots = existing ?? document.createElement('meta');
    const created = !existing;
    const previousRobots = existing?.getAttribute('content') ?? null;
    robots.setAttribute('name', 'robots');
    robots.setAttribute('content', 'noindex, nofollow');
    if (created) document.head.appendChild(robots);

    return () => {
      document.title = previousTitle;
      if (created) robots.remove();
      else if (previousRobots) robots.setAttribute('content', previousRobots);
    };
  }, []);

  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-[#000B29] px-6 py-16 text-center text-white">
      <FeLogo size={72} />
      <p className="mt-8 text-xs font-semibold uppercase tracking-[0.35em] text-[#C1F0F6]">
        Fashion Edge
      </p>
      <h1 className="font-display mt-4 max-w-xl text-4xl font-bold uppercase leading-tight tracking-tight sm:text-5xl">
        {title}
      </h1>
      <span className="mt-8 block h-px w-16 bg-[#C1F0F6]" aria-hidden="true" />
      <p className="mt-8 max-w-md text-base leading-relaxed text-white/75">{description}</p>
    </main>
  );
}
