import { Link } from '@tanstack/react-router';
import { Heart, MapPin, Package, RotateCcw, UserCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { ROUTES } from '@/constants';
import {
  computeProfileCompletion,
  useAddressesQuery,
  useCustomerProfileQuery,
} from '@/hooks/account';
import { useRecentOrdersQuery } from '@/hooks/orders';
import { useWishlistItemCountQuery } from '@/hooks/wishlist';
import { useAuthStore } from '@/store';
import { AccountPageHeader } from '@/components/account/account-page-header';
import { OrderListItem, OrderNotificationBanners, OrderStatusBadge } from '@/components/orders';
import { StatCard } from '@/components/account/stat-card';
import { AuthErrorAlert } from '@/components/auth/auth-error-alert';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/utils/format';

export function AccountDashboard() {
  const user = useAuthStore((state) => state.user);
  const profileQuery = useCustomerProfileQuery();
  const addressesQuery = useAddressesQuery();
  const wishlistQuery = useWishlistItemCountQuery();
  const recentOrdersQuery = useRecentOrdersQuery(3);

  const profileCompletion = computeProfileCompletion(profileQuery.data);
  const displayName =
    profileQuery.data?.firstName || user?.firstName || user?.email?.split('@')[0] || 'there';

  const recentOrders = recentOrdersQuery.data?.data ?? [];
  const latestOrder = recentOrders[0];
  const isLoading =
    profileQuery.isLoading || addressesQuery.isLoading || recentOrdersQuery.isLoading;

  return (
    <div>
      <AccountPageHeader
        title={`Hello, ${displayName}`}
        description="Manage your profile, orders, addresses, and account settings."
      />

      <OrderNotificationBanners />

      {(profileQuery.error || addressesQuery.error || recentOrdersQuery.error) && (
        <div className="mb-4 space-y-2">
          {profileQuery.error ? (
            <AuthErrorAlert error={profileQuery.error} onRetry={() => profileQuery.refetch()} />
          ) : null}
          {addressesQuery.error ? (
            <AuthErrorAlert error={addressesQuery.error} onRetry={() => addressesQuery.refetch()} />
          ) : null}
          {recentOrdersQuery.error ? (
            <AuthErrorAlert
              error={recentOrdersQuery.error}
              onRetry={() => recentOrdersQuery.refetch()}
            />
          ) : null}
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" aria-busy="true">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Recent orders"
            value={recentOrdersQuery.data?.meta?.total ?? recentOrders.length}
            icon={Package}
            description="Purchases in your account"
          />
          <StatCard
            title="Saved addresses"
            value={addressesQuery.data?.length ?? 0}
            icon={MapPin}
            description="Shipping and billing locations"
          />
          <StatCard
            title="Wishlists"
            value={wishlistQuery.data ?? 0}
            icon={Heart}
            description="Saved collections"
          />
          <StatCard
            title="Profile completion"
            value={`${profileCompletion}%`}
            icon={UserCircle}
            description="Complete your profile for faster checkout"
          />
        </div>
      )}

      {latestOrder ? (
        <motion.section
          className="border-border/70 bg-card/80 mt-8 rounded-[1.75rem] border p-6 shadow-[var(--shadow-soft)] backdrop-blur"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-medium">Current order</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                {latestOrder.orderNumber} ·{' '}
                {formatCurrency(latestOrder.totals.grandTotal, latestOrder.currency)}
              </p>
            </div>
            <OrderStatusBadge status={latestOrder.status} />
          </div>
          <Button asChild className="mt-4" variant="outline" size="sm">
            <Link to="/account/orders/$orderId" params={{ orderId: latestOrder.id }}>
              View order details
            </Link>
          </Button>
        </motion.section>
      ) : null}

      <section className="border-border mt-8 rounded-xl border p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-medium">Profile completion</h2>
            <p className="text-muted-foreground text-sm">
              Add your details to personalize recommendations and checkout.
            </p>
          </div>
          <span className="text-sm font-medium">{profileCompletion}%</span>
        </div>
        <Progress value={profileCompletion} className="mt-4" aria-label="Profile completion" />
      </section>

      <section className="mt-8">
        <h2 className="mb-4 font-medium">Quick actions</h2>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link to={ROUTES.accountOrders}>View orders</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to={ROUTES.accountReturns}>
              <RotateCcw className="size-4" aria-hidden />
              Returns
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to={ROUTES.accountProfile}>Edit profile</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to={ROUTES.accountAddresses}>Manage addresses</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to={ROUTES.accountSecurity}>Change password</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to={ROUTES.accountPreferences}>Update preferences</Link>
          </Button>
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-medium">Recent orders</h2>
          <Button asChild variant="ghost" size="sm">
            <Link to={ROUTES.accountOrders}>View all</Link>
          </Button>
        </div>
        {recentOrdersQuery.isLoading ? (
          <Skeleton className="h-28 w-full" aria-busy="true" />
        ) : recentOrders.length > 0 ? (
          <ul className="space-y-4">
            {recentOrders.map((order, index) => (
              <OrderListItem key={order.id} order={order} index={index} />
            ))}
          </ul>
        ) : (
          <div className="border-border text-muted-foreground rounded-xl border border-dashed p-6 text-center text-sm">
            No orders yet.{' '}
            <Link to={ROUTES.products} className="text-primary hover:underline">
              Start shopping
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
