import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';

export interface CmsLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  preload?: 'intent' | 'render' | false;
}

/** Internal routes use TanStack Router; external CMS URLs use a plain anchor. */
export function CmsLink({ href, children, className, preload = 'intent' }: CmsLinkProps) {
  if (
    href.startsWith('http://') ||
    href.startsWith('https://') ||
    href.startsWith('mailto:') ||
    href.startsWith('tel:')
  ) {
    return (
      <a
        href={href}
        className={className}
        target={href.startsWith('http') ? '_blank' : undefined}
        rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
      >
        {children}
      </a>
    );
  }

  return (
    <Link to={href} preload={preload} className={className}>
      {children}
    </Link>
  );
}
