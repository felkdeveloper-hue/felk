import { Link } from '@tanstack/react-router';
import {
  BookOpen,
  Heart,
  HelpCircle,
  MapPin,
  Package,
  RotateCcw,
  Settings,
  Shield,
  User,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { ROUTES } from '@/constants';
import { useCustomerProfileQuery } from '@/hooks/account';
import { useAuthStore } from '@/store';
import { OrderNotificationBanners } from '@/components/orders';
import { AuthErrorAlert } from '@/components/auth/auth-error-alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const ACTION_TILES = [
  {
    title: 'My Orders',
    description: 'View, modify and track orders',
    to: ROUTES.accountOrders,
    icon: Package,
  },
  {
    title: 'Returns',
    description: 'Request and track returns',
    to: ROUTES.accountReturns,
    icon: RotateCcw,
  },
  {
    title: 'Wishlist',
    description: 'Saved items and collections',
    to: ROUTES.wishlist,
    icon: Heart,
  },
  {
    title: 'My Addresses',
    description: 'Edit, add or remove addresses',
    to: ROUTES.accountAddresses,
    icon: MapPin,
  },
  {
    title: 'My Profile',
    description: 'Edit personal info and change password',
    to: ROUTES.accountProfile,
    icon: User,
  },
  {
    title: 'Security',
    description: 'Password and signed-in devices',
    to: ROUTES.accountSecurity,
    icon: Shield,
  },
  {
    title: 'Preferences',
    description: 'Notifications and shopping prefs',
    to: ROUTES.accountPreferences,
    icon: Settings,
  },
  {
    title: 'Help & Support',
    description: 'Reach out to us',
    to: ROUTES.contact,
    icon: HelpCircle,
  },
  {
    title: 'Our Story',
    description: 'About Fashion Edge',
    to: ROUTES.about,
    icon: BookOpen,
  },
] as const;

export function AccountDashboard() {
  const user = useAuthStore((state) => state.user);
  const profileQuery = useCustomerProfileQuery();

  const profile = profileQuery.data;
  const displayName =
    profile?.firstName || user?.firstName || user?.email?.split('@')[0] || 'there';
  const fullName = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || displayName;
  const email = profile?.email || user?.email || '';
  const phone = profile?.phone?.trim() || '';
  const initial = (displayName.charAt(0) || 'A').toUpperCase();
  const photoUrl = profile?.profilePhotoUrl || user?.avatarUrl || null;

  return (
    <div className="space-y-6">
      <OrderNotificationBanners />

      {profileQuery.error ? (
        <AuthErrorAlert error={profileQuery.error} onRetry={() => profileQuery.refetch()} />
      ) : null}

      {profileQuery.isLoading ? (
        <Skeleton className="h-44 w-full rounded-2xl" aria-busy="true" />
      ) : (
        <motion.section
          className="dark:bg-secondary overflow-hidden rounded-2xl bg-[hsl(40_45%_92%)]"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div className="flex items-start gap-4 px-5 pt-6 sm:px-6 sm:pt-7">
            <div
              className={cn(
                'flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full',
                'text-foreground bg-[hsl(45_95%_55%)] text-lg font-bold sm:size-16',
              )}
              aria-hidden={!photoUrl}
            >
              {photoUrl ? (
                <img src={photoUrl} alt="" className="size-full object-cover" />
              ) : (
                <span aria-hidden>{initial}</span>
              )}
            </div>
            <div className="min-w-0 pt-0.5">
              <h1 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">
                {fullName}
              </h1>
              {email ? (
                <p className="text-muted-foreground mt-1 truncate text-sm sm:text-base">{email}</p>
              ) : null}
              {phone ? (
                <p className="text-muted-foreground mt-0.5 text-sm sm:text-base">{phone}</p>
              ) : null}
            </div>
          </div>
          <div className="p-4 sm:p-5">
            <Button
              asChild
              className="text-foreground h-12 w-full rounded-xl bg-[hsl(45_95%_55%)] text-base font-bold uppercase tracking-wide hover:bg-[hsl(45_95%_50%)]"
            >
              <Link to={ROUTES.accountProfile}>Edit profile</Link>
            </Button>
          </div>
        </motion.section>
      )}

      <motion.div
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.04 } },
        }}
      >
        {ACTION_TILES.map((tile) => {
          const Icon = tile.icon;
          return (
            <motion.div
              key={tile.to}
              variants={{
                hidden: { opacity: 0, y: 10 },
                show: { opacity: 1, y: 0 },
              }}
            >
              <Link
                to={tile.to}
                className={cn(
                  'border-border bg-card group flex h-full items-start gap-3 rounded-xl border p-4',
                  'hover:border-foreground/25 hover:bg-muted/40 transition-colors',
                  'focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                )}
              >
                <span className="bg-muted text-foreground mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-lg">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold tracking-tight sm:text-base">
                    {tile.title}
                  </span>
                  <span className="text-muted-foreground mt-0.5 block text-xs leading-snug sm:text-sm">
                    {tile.description}
                  </span>
                </span>
              </Link>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
