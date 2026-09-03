import { useEffect, useMemo, useState } from 'react';
import { useRouterState } from '@tanstack/react-router';
import { useSocialLinks } from '@/hooks/cms';
import { useMediaQuery } from '@/hooks/use-media-query';
import { ROUTES } from '@/constants';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

const FALLBACK_LINKS = {
  instagram: 'https://www.instagram.com/fashion__edge__/',
  facebook: 'https://www.facebook.com/fashionedge.lk/',
  tiktok: 'https://www.tiktok.com/@fashion_edge_',
} as const;

type SocialKey = keyof typeof FALLBACK_LINKS;

/** Closed-state icon rotation order on mobile. */
const ROTATION_ORDER: SocialKey[] = ['instagram', 'tiktok', 'facebook'];

/** Official Instagram brand gradient. */
const INSTAGRAM_GRADIENT =
  'linear-gradient(135deg, #FCAF45 0%, #F77737 18%, #E1306C 52%, #C13584 74%, #833AB4 100%)';

const BRAND_BACKGROUNDS: Record<SocialKey, string> = {
  instagram: INSTAGRAM_GRADIENT,
  facebook: '#1877F2',
  tiktok: '#000000',
};

function InstagramIcon({ size = 22 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="#fff" aria-hidden>
      <path d="M12 7.2A4.8 4.8 0 1 0 12 16.8 4.8 4.8 0 0 0 12 7.2Zm0 7.9a3.1 3.1 0 1 1 0-6.2 3.1 3.1 0 0 1 0 6.2Zm6.1-8.2a1.12 1.12 0 1 1-2.24 0 1.12 1.12 0 0 1 2.24 0ZM12 2.5c-2.6 0-2.9.01-3.95.06-2.66.12-4.07 1.54-4.2 4.2C3.7 7.8 3.7 8.1 3.7 12s0 4.2.15 5.24c.13 2.66 1.54 4.08 4.2 4.2 1.05.05 1.35.06 3.95.06s2.9-.01 3.95-.06c2.66-.12 4.07-1.54 4.2-4.2.05-1.04.06-1.34.06-5.24s0-4.2-.06-3.95c-.13-2.66-1.54-4.08-4.2-4.2C14.9 2.51 14.6 2.5 12 2.5Zm0 1.53c2.55 0 2.85.01 3.86.06 1.83.08 2.85 1.1 2.93 2.93.05 1 .06 1.3.06 3.86s-.01 2.85-.06 3.86c-.08 1.82-1.1 2.85-2.93 2.93-1 .05-1.3.06-3.86.06s-2.85-.01-3.86-.06c-1.83-.08-2.85-1.11-2.93-2.93-.05-1-.06-1.3-.06-3.86s.01-2.85.06-3.86c.08-1.83 1.1-2.85 2.93-2.93 1.01-.05 1.31-.06 3.86-.06Z" />
    </svg>
  );
}

function FacebookIcon({ size = 22 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="#fff" aria-hidden>
      <path d="M14.5 8.5V6.8c0-.6.1-.9.9-.9h1.5V3h-2.4c-2.7 0-3.7 1.5-3.7 3.8v1.7H8.5V12h2.3v9h3.7v-9h2.5l.5-3.5h-3Z" />
    </svg>
  );
}

function TikTokIcon({ size = 22 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="#fff" aria-hidden>
      <path d="M16.6 5.8A4.7 4.7 0 0 1 14.2 3h-2.5v12.2a2.4 2.4 0 1 1-1.7-2.3V10a5 5 0 1 0 4.2 4.9V9.4a7.1 7.1 0 0 0 4.1 1.3V8.1a4.7 4.7 0 0 1-1.7-2.3Z" />
    </svg>
  );
}

const PLATFORMS: Array<{
  key: SocialKey;
  label: string;
  Icon: typeof InstagramIcon;
}> = [
  { key: 'instagram', label: 'Instagram', Icon: InstagramIcon },
  { key: 'facebook', label: 'Facebook', Icon: FacebookIcon },
  { key: 'tiktok', label: 'TikTok', Icon: TikTokIcon },
];

function resolveUrl(
  key: SocialKey,
  links: Array<{ platform: string; url: string }> | undefined,
): string {
  const match = links?.find((link) => link.platform.toLowerCase() === key);
  return match?.url?.trim() || FALLBACK_LINKS[key];
}

const DOCK_STYLE = {
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'center',
  background: 'rgba(20, 20, 24, 0.85)',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  boxShadow: '0 10px 35px rgba(0, 0, 0, 0.35)',
};

function SocialIconLink({
  label,
  url,
  background,
  Icon,
  iconSize,
  buttonSize,
  onClick,
  tabIndex,
}: {
  label: string;
  url: string;
  background: string;
  Icon: typeof InstagramIcon;
  iconSize: number;
  buttonSize: number;
  onClick?: () => void;
  tabIndex?: number;
}) {
  return (
    <a
      data-radius="pill"
      href={url}
      target="_blank"
      rel="noreferrer noopener"
      aria-label={label}
      tabIndex={tabIndex}
      onClick={onClick}
      style={{
        width: buttonSize,
        height: buttonSize,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background,
        textDecoration: 'none',
        transition: 'transform 0.2s ease',
        boxShadow: '0 4px 14px -4px rgba(0, 0, 0, 0.45)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.06)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      <Icon size={iconSize} />
    </a>
  );
}

/** Vertical floating capsule dock — desktop only. Mobile gets a single expandable FAB. */
export function FloatingSocialBar({ className }: { className?: string }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const hideOnCheckout = pathname.startsWith(ROUTES.checkout);
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const { data } = useSocialLinks();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSocialIndex, setActiveSocialIndex] = useState(0);

  const items = useMemo(
    () =>
      PLATFORMS.map(({ key, label, Icon }) => ({
        key,
        label,
        Icon,
        url: resolveUrl(key, data?.data),
        background: BRAND_BACKGROUNDS[key],
      })),
    [data?.data],
  );

  const rotatedItem = useMemo(() => {
    const key = ROTATION_ORDER[activeSocialIndex] ?? 'instagram';
    return items.find((item) => item.key === key) ?? items[0];
  }, [activeSocialIndex, items]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  useEffect(() => {
    if (isDesktop || mobileOpen) return;

    const intervalId = window.setInterval(() => {
      setActiveSocialIndex((index) => (index + 1) % ROTATION_ORDER.length);
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, [isDesktop, mobileOpen]);

  if (hideOnCheckout) return null;

  if (isDesktop) {
    return (
      <div
        aria-label="Social media"
        data-radius="pill"
        className={cn('social-dock z-60 pointer-events-auto fixed', className)}
        style={{
          ...DOCK_STYLE,
          right: 24,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 72,
          padding: '12px 10px',
          gap: 12,
        }}
      >
        {items.map(({ key, label, url, background, Icon }) => (
          <SocialIconLink
            key={key}
            label={label}
            url={url}
            background={background}
            Icon={Icon}
            iconSize={22}
            buttonSize={48}
          />
        ))}
      </div>
    );
  }

  const closedBackground = rotatedItem?.background ?? INSTAGRAM_GRADIENT;
  const ClosedIcon = rotatedItem?.Icon ?? InstagramIcon;

  return (
    <>
      <div
        aria-label="Social media"
        className={cn(
          'z-70 pointer-events-auto fixed flex flex-col-reverse items-center',
          className,
        )}
        style={{
          right: 14,
          /* Above bottom nav */
          bottom: 'calc(3.5rem + 0.75rem + env(safe-area-inset-bottom, 0px))',
          gap: mobileOpen ? 10 : 0,
        }}
      >
        <button
          type="button"
          data-radius="pill"
          aria-label={
            mobileOpen
              ? 'Close social links'
              : `Open social links — ${rotatedItem?.label ?? 'Instagram'}`
          }
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((open) => !open)}
          className="transition-transform duration-200 active:scale-95"
          style={{
            width: 42,
            height: 42,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            borderRadius: 9999,
            cursor: 'pointer',
            background: mobileOpen ? '#2a2a2e' : closedBackground,
            boxShadow: '0 4px 16px -4px rgba(0, 0, 0, 0.35)',
            transition: 'background 0.3s ease, box-shadow 0.3s ease',
          }}
        >
          {mobileOpen ? (
            <X size={20} color="#fff" strokeWidth={2.25} />
          ) : (
            <span key={rotatedItem?.key ?? 'instagram'} className="social-fab-icon-enter">
              <ClosedIcon size={20} />
            </span>
          )}
        </button>

        <div
          className={cn(
            'flex flex-col-reverse items-center overflow-hidden transition-all duration-300 ease-out',
            mobileOpen
              ? 'max-h-52 translate-y-0 gap-2.5 opacity-100'
              : 'pointer-events-none max-h-0 -translate-y-1 gap-0 opacity-0',
          )}
          aria-hidden={!mobileOpen}
        >
          {items.map(({ key, label, url, background, Icon }) => (
            <SocialIconLink
              key={key}
              label={label}
              url={url}
              background={background}
              Icon={Icon}
              iconSize={18}
              buttonSize={40}
              tabIndex={mobileOpen ? 0 : -1}
              onClick={() => setMobileOpen(false)}
            />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes social-fab-icon-enter {
          from {
            opacity: 0;
            transform: scale(0.82);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .social-fab-icon-enter {
          display: flex;
          align-items: center;
          justify-content: center;
          animation: social-fab-icon-enter 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
