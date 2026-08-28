import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Bell } from 'lucide-react';
import { useFlashSale } from '@/contexts/flash-sale-context';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ROUTES } from '@/constants/routes';
import { cn } from '@/lib/utils';

interface NotificationBellProps {
  lightChrome?: boolean;
  className?: string;
}

export function NotificationBell({ lightChrome, className }: NotificationBellProps) {
  const isAuthenticated = useAuthStore((state) => Boolean(state.accessToken && state.user));
  const { isFlashSaleActive, formattedTime, timeRemaining } = useFlashSale();
  const [open, setOpen] = useState(false);

  const hasNotification = !isAuthenticated || isFlashSaleActive;

  const iconBtn = cn(
    'relative size-11 shrink-0 [&_svg]:size-[1.15rem] [&_svg]:stroke-[1.35]',
    lightChrome
      ? 'text-white hover:bg-white/10 hover:text-white'
      : 'text-foreground hover:bg-muted/70 hover:text-foreground',
    className,
  );

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Notifications" className={iconBtn}>
          <Bell />
          {hasNotification && (
            <span
              className="absolute right-2 top-2 size-2 rounded-full bg-red-500"
              style={{
                animation: 'notif-ping 1.5s cubic-bezier(0,0,0.2,1) infinite',
                boxShadow: '0 0 0 0 rgba(239,68,68,0.7)',
              }}
              aria-hidden
            />
          )}
          <style>{`
            @keyframes notif-ping {
              0%    { box-shadow: 0 0 0 0 rgba(239,68,68,0.7); }
              70%   { box-shadow: 0 0 0 6px rgba(239,68,68,0); }
              100%  { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
            }
          `}</style>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-80 overflow-hidden rounded-xl border-0 p-0 shadow-[0_8px_40px_rgba(0,0,0,0.15)]"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="text-sm font-semibold">Notifications</span>
          {hasNotification && (
            <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
              1
            </span>
          )}
        </div>

        {/* Content */}
        {isFlashSaleActive ? (
          /* Signed in + active flash sale */
          <div
            className="p-4"
            style={{
              background: 'linear-gradient(135deg, #fff7ed 0%, #fff0dc 50%, #fff7ed 100%)',
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full text-xl"
                style={{
                  background: 'linear-gradient(135deg, #ff4500, #ff8c00)',
                  boxShadow: '0 2px 12px rgba(255,80,0,0.4)',
                }}
              >
                ⚡
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-0.5 text-sm font-bold text-orange-900">Flash Sale Active!</div>
                <p className="mb-2 text-xs leading-relaxed text-orange-700">
                  You have <span className="font-bold text-red-600">20% extra off</span> everything.
                  Hurry — offer expires in{' '}
                  <span
                    className="font-black tabular-nums text-red-600"
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {formattedTime}
                  </span>
                  !
                </p>
                {/* Progress bar */}
                <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-orange-200">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, (timeRemaining / (60 * 60 * 1000)) * 100)}%`,
                      background: 'linear-gradient(90deg, #ff4500, #ffd700)',
                      transition: 'width 1s linear',
                    }}
                  />
                </div>
                <Link
                  to={ROUTES.products}
                  onClick={() => setOpen(false)}
                  className="inline-block rounded-lg px-3 py-1.5 text-xs font-bold text-white transition-all hover:scale-105"
                  style={{
                    background: 'linear-gradient(135deg, #ff4500, #ff8c00)',
                    boxShadow: '0 2px 10px rgba(255,80,0,0.4)',
                  }}
                >
                  🛍️ Shop Now
                </Link>
              </div>
            </div>
          </div>
        ) : !isAuthenticated ? (
          /* Guest / visitor */
          <div
            className="p-4"
            style={{
              background: 'linear-gradient(135deg, #fff7ed 0%, #fff0dc 50%, #fff7ed 100%)',
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full text-xl"
                style={{
                  background: 'linear-gradient(135deg, #ff4500, #ff8c00)',
                  boxShadow: '0 2px 12px rgba(255,80,0,0.4)',
                }}
              >
                🔥
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-0.5 text-sm font-bold text-orange-900">
                  Exclusive Flash Sale Offer!
                </div>
                <p className="mb-3 text-xs leading-relaxed text-orange-700">
                  Sign in or create an account to unlock{' '}
                  <span className="font-bold text-red-600">20% extra off</span> everything for 1
                  hour — only for members!
                </p>
                <div className="flex gap-2">
                  <Link
                    to={ROUTES.authLogin}
                    onClick={() => setOpen(false)}
                    className="flex-1 rounded-lg px-3 py-1.5 text-center text-xs font-bold text-white transition-all hover:scale-105"
                    style={{
                      background: 'linear-gradient(135deg, #ff4500, #ff8c00)',
                      boxShadow: '0 2px 10px rgba(255,80,0,0.4)',
                    }}
                  >
                    Sign In
                  </Link>
                  <Link
                    to={ROUTES.authRegister}
                    onClick={() => setOpen(false)}
                    className="flex-1 rounded-lg border border-orange-300 px-3 py-1.5 text-center text-xs font-semibold text-orange-700 transition-colors hover:bg-orange-50"
                  >
                    Sign Up
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Signed in, no active flash sale */
          <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
            <Bell className="text-muted-foreground/40 mb-2 size-8" />
            <p className="text-muted-foreground text-sm">No new notifications</p>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
