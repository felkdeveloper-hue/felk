import { useEffect, useMemo, useState } from 'react';
import { useRouterState } from '@tanstack/react-router';
import { useSocialLinks } from '@/hooks/cms';
import { ROUTES } from '@/constants';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

const FALLBACK_LINKS = {
  instagram: 'https://www.instagram.com/fashion__edge__/',
  facebook: 'https://www.facebook.com/fashionedge.lk/',
  tiktok: 'https://www.tiktok.com/@fashion_edge_',
} as const;

type SocialKey = keyof typeof FALLBACK_LINKS;

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 7.2A4.8 4.8 0 1 0 12 16.8 4.8 4.8 0 0 0 12 7.2Zm0 7.9a3.1 3.1 0 1 1 0-6.2 3.1 3.1 0 0 1 0 6.2Zm6.1-8.2a1.12 1.12 0 1 1-2.24 0 1.12 1.12 0 0 1 2.24 0ZM12 2.5c-2.6 0-2.9.01-3.95.06-2.66.12-4.07 1.54-4.2 4.2C3.7 7.8 3.7 8.1 3.7 12s0 4.2.15 5.24c.13 2.66 1.54 4.08 4.2 4.2 1.05.05 1.35.06 3.95.06s2.9-.01 3.95-.06c2.66-.12 4.07-1.54 4.2-4.2.05-1.04.06-1.34.06-5.24s0-4.2-.06-3.95c-.13-2.66-1.54-4.08-4.2-4.2C14.9 2.51 14.6 2.5 12 2.5Zm0 1.53c2.55 0 2.85.01 3.86.06 1.83.08 2.85 1.1 2.93 2.93.05 1 .06 1.3.06 3.86s-.01 2.85-.06 3.86c-.08 1.82-1.1 2.85-2.93 2.93-1 .05-1.3.06-3.86.06s-2.85-.01-3.86-.06c-1.83-.08-2.85-1.11-2.93-2.93-.05-1-.06-1.3-.06-3.86s.01-2.85.06-3.86c.08-1.83 1.1-2.85 2.93-2.93 1.01-.05 1.31-.06 3.86-.06Z" />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M14.5 8.5V6.8c0-.6.1-.9.9-.9h1.5V3h-2.4c-2.7 0-3.7 1.5-3.7 3.8v1.7H8.5V12h2.3v9h3.7v-9h2.5l.5-3.5h-3Z" />
    </svg>
  );
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M16.6 5.8A4.7 4.7 0 0 1 14.2 3h-2.5v12.2a2.4 2.4 0 1 1-1.7-2.3V10a5 5 0 1 0 4.2 4.9V9.4a7.1 7.1 0 0 0 4.1 1.3V8.1a4.7 4.7 0 0 1-1.7-2.3Z" />
    </svg>
  );
}

const PLATFORMS: Array<{
  key: SocialKey;
  label: string;
  bg: string;
  Icon: typeof InstagramIcon;
}> = [
  {
    key: 'instagram',
    label: 'Instagram',
    bg: 'bg-gradient-to-br from-[#FCAF45] via-[#E1306C] to-[#833AB4]',
    Icon: InstagramIcon,
  },
  {
    key: 'facebook',
    label: 'Facebook',
    bg: 'bg-[#1877F2]',
    Icon: FacebookIcon,
  },
  {
    key: 'tiktok',
    label: 'TikTok',
    bg: 'bg-black',
    Icon: TikTokIcon,
  },
];

function resolveUrl(
  key: SocialKey,
  links: Array<{ platform: string; url: string }> | undefined,
): string {
  const match = links?.find((link) => link.platform.toLowerCase() === key);
  return match?.url?.trim() || FALLBACK_LINKS[key];
}

/** Fixed social bar — desktop side rail unchanged; mobile FAB expands in place. */
export function FloatingSocialBar({ className }: { className?: string }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const hideOnCheckout = pathname.startsWith(ROUTES.checkout);
  const { data } = useSocialLinks();
  const [mobileOpen, setMobileOpen] = useState(false);

  const items = useMemo(
    () =>
      PLATFORMS.map(({ key, label, bg, Icon }) => ({
        key,
        label,
        bg,
        Icon,
        url: resolveUrl(key, data?.data),
      })),
    [data?.data],
  );

  const primary = items[0];

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  if (hideOnCheckout) return null;

  return (
    <>
      {/* Desktop — unchanged right-edge pill */}
      <aside
        aria-label="Social media"
        className={cn(
          'z-60 pointer-events-none fixed right-3 top-1/2 hidden -translate-y-1/2 sm:block',
          className,
        )}
      >
        <div
          className={cn(
            'pointer-events-auto flex flex-col items-center gap-3 px-2.5 py-4',
            'bg-[#1e1e1e] shadow-[0_16px_48px_-20px_rgba(0,0,0,0.65)] backdrop-blur-lg',
            'ring-1 ring-inset ring-white/10',
          )}
          style={{ borderRadius: '999px' }}
        >
          {items.map(({ key, label, url, bg, Icon }) => (
            <a
              key={key}
              href={url}
              target="_blank"
              rel="noreferrer noopener"
              aria-label={label}
              className={cn(
                'inline-flex size-10 items-center justify-center rounded-full',
                'transition-all duration-200 hover:scale-110',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black/40',
                bg,
              )}
            >
              <Icon className="size-4.5 text-white" />
            </a>
          ))}
        </div>
      </aside>

      {/* Mobile FAB — smaller + lower so it clears product hearts / filter chips */}
      <aside
        aria-label="Social media"
        className={cn(
          'pointer-events-none fixed bottom-[calc(5.85rem+env(safe-area-inset-bottom,0px))] right-2.5 z-[70] sm:hidden',
          className,
        )}
      >
        <div className="pointer-events-auto flex flex-col-reverse items-center gap-2">
          {primary ? (
            <button
              type="button"
              aria-label={mobileOpen ? 'Close social links' : `Open ${primary.label}`}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((open) => !open)}
              className={cn(
                'inline-flex size-9 items-center justify-center rounded-full',
                'shadow-[0_8px_22px_-10px_rgba(0,0,0,0.5)] ring-2 ring-white/90',
                'transition-all duration-300 ease-out active:scale-95',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/40',
                mobileOpen ? 'bg-neutral-900 text-white' : primary.bg,
              )}
            >
              {mobileOpen ? (
                <X className="size-4 text-white" strokeWidth={2.25} />
              ) : (
                <primary.Icon className="size-4 text-white" />
              )}
            </button>
          ) : null}

          <div
            className={cn(
              'flex flex-col-reverse items-center gap-2 overflow-hidden transition-all duration-300 ease-out',
              mobileOpen
                ? 'max-h-40 translate-y-0 opacity-100'
                : 'pointer-events-none max-h-0 -translate-y-1 opacity-0',
            )}
            aria-hidden={!mobileOpen}
          >
            {items.map(({ key, label, url, bg, Icon }, index) => (
              <a
                key={key}
                href={url}
                target="_blank"
                rel="noreferrer noopener"
                aria-label={label}
                tabIndex={mobileOpen ? 0 : -1}
                className={cn(
                  'inline-flex size-9 items-center justify-center rounded-full',
                  'shadow-[0_8px_22px_-10px_rgba(0,0,0,0.5)] ring-2 ring-white/90',
                  'transition-all duration-300 ease-out',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/40',
                  bg,
                )}
                style={{
                  transitionDelay: mobileOpen ? `${index * 45}ms` : '0ms',
                  transform: mobileOpen ? 'scale(1)' : 'scale(0.7)',
                }}
                onClick={() => setMobileOpen(false)}
              >
                <Icon className="size-3.5 text-white" />
              </a>
            ))}
          </div>
        </div>
      </aside>
    </>
  );
}
