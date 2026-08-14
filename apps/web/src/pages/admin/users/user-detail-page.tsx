import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import {
  AdminErrorState,
  AdminPageHeader,
  AdminPanel,
  DataTable,
  PageMotion,
} from '@/components/admin';
import { ADMIN_ROUTES, QUERY_KEYS } from '@/constants';
import { useCustomerTimeline } from '@/hooks/admin';
import { cn, formatDate } from '@/lib/utils';
import { usersApi, type AdminUserDetail } from '@/services/sdk/admin/users';

function displayName(user: AdminUserDetail) {
  const first = user.firstName?.trim();
  const last = user.lastName?.trim();
  if (first && last) return `${first} ${last}`;
  return first || last || user.email;
}

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function UserDetailPage({ userId }: { userId: string }) {
  const [tab, setTab] = useState<'overview' | 'activity'>('overview');

  const query = useQuery({
    queryKey: QUERY_KEYS.adminUsers.detail(userId),
    queryFn: () => usersApi.getById(userId),
  });

  const timeline = useCustomerTimeline(userId);
  const user = query.data;

  const groupedActivity = useMemo(() => {
    const items = timeline.data ?? [];
    const map = new Map<string, typeof items>();
    for (const item of items) {
      const day = formatDate(item.at);
      const list = map.get(day) ?? [];
      list.push(item);
      map.set(day, list);
    }
    return [...map.entries()];
  }, [timeline.data]);

  if (query.isError) {
    return <AdminErrorState message="Unable to load user." onRetry={() => query.refetch()} />;
  }

  return (
    <PageMotion>
      <AdminPageHeader
        title={user ? displayName(user) : 'User'}
        description={user?.email ?? 'Loading…'}
        actions={
          <Link to={ADMIN_ROUTES.users}>
            <Button variant="outline" size="sm">
              Back to users
            </Button>
          </Link>
        }
      />

      <div className="mb-4 flex gap-2 border-b">
        <TabButton active={tab === 'overview'} onClick={() => setTab('overview')}>
          Overview
        </TabButton>
        <TabButton active={tab === 'activity'} onClick={() => setTab('activity')}>
          Website activity
        </TabButton>
      </div>

      {query.isLoading ? (
        <p className="text-muted-foreground text-sm">Loading user…</p>
      ) : !user ? null : tab === 'overview' ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <AdminPanel title="Profile">
            <dl className="space-y-2 text-sm">
              <Row label="Email" value={user.email} />
              <Row label="Role" value={user.roleKey.replaceAll('_', ' ')} />
              <Row label="Status" value={user.status.replaceAll('_', ' ')} />
              <Row label="Joined" value={user.createdAt ? formatDate(user.createdAt) : '—'} />
              <Row label="Last login country" value={user.lastLoginCountry || '—'} />
              <Row label="Last login device" value={user.lastLoginDevice || '—'} />
            </dl>
          </AdminPanel>

          <AdminPanel title="Cart items">
            {!user.cartItems.length ? (
              <p className="text-muted-foreground text-sm">No items in cart.</p>
            ) : (
              <ul className="space-y-3">
                {user.cartItems.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start justify-between gap-3 rounded-lg border p-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-muted-foreground text-xs">
                        {[item.colorName, item.sizeName].filter(Boolean).join(' · ') || '—'}
                      </p>
                      <p className="text-muted-foreground mt-1 text-xs">
                        Qty {item.quantity} · {formatMoney(item.currentPrice, item.currency)}
                      </p>
                    </div>
                    {item.updatedAt ? (
                      <time className="text-muted-foreground shrink-0 text-xs">
                        {formatDate(item.updatedAt)}
                      </time>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </AdminPanel>

          <div className="xl:col-span-2">
            <AdminPanel title="Orders">
              {!user.orders.length ? (
                <p className="text-muted-foreground text-sm">No orders yet.</p>
              ) : (
                <DataTable
                  data={user.orders}
                  getRowId={(row) => row.id}
                  columns={[
                    {
                      id: 'orderNumber',
                      header: 'Order',
                      cell: (row) => (
                        <Link
                          to={ADMIN_ROUTES.orderDetail}
                          params={{ orderId: row.id }}
                          className="text-primary font-medium hover:underline"
                        >
                          {row.orderNumber}
                        </Link>
                      ),
                    },
                    {
                      id: 'status',
                      header: 'Status',
                      cell: (row) => (
                        <span className="capitalize">{row.status.replaceAll('_', ' ')}</span>
                      ),
                    },
                    {
                      id: 'items',
                      header: 'Items',
                      cell: (row) => row.itemCount,
                    },
                    {
                      id: 'total',
                      header: 'Total',
                      cell: (row) => formatMoney(row.grandTotal, row.currency),
                    },
                    {
                      id: 'placedAt',
                      header: 'Placed',
                      cell: (row) =>
                        row.placedAt || row.createdAt
                          ? formatDate(row.placedAt ?? row.createdAt!)
                          : '—',
                    },
                  ]}
                />
              )}
            </AdminPanel>
          </div>
        </div>
      ) : (
        <AdminPanel title="Browsing & purchase activity">
          {timeline.isError ? (
            <AdminErrorState
              message="Unable to load activity."
              onRetry={() => timeline.refetch()}
            />
          ) : timeline.isLoading ? (
            <p className="text-muted-foreground text-sm">Loading activity…</p>
          ) : !groupedActivity.length ? (
            <p className="text-muted-foreground text-sm">No tracked website activity yet.</p>
          ) : (
            <div className="space-y-6">
              {groupedActivity.map(([day, items]) => (
                <div key={day}>
                  <p className="text-muted-foreground mb-3 text-xs font-semibold uppercase tracking-wide">
                    {day}
                  </p>
                  <ol className="relative space-y-3 border-l pl-4">
                    {items.map((item) => (
                      <li key={item.id} className="relative text-sm">
                        <span className="bg-primary absolute -left-[21px] top-1.5 size-2.5 rounded-full" />
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <p className="font-medium">{item.label}</p>
                          <time className="text-muted-foreground text-xs tabular-nums">
                            {formatDate(item.at)}
                          </time>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          )}
        </AdminPanel>
      )}
    </PageMotion>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-neutral-500">{label}</dt>
      <dd className="text-right capitalize">{value}</dd>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        '-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors',
        active
          ? 'border-foreground text-foreground'
          : 'text-muted-foreground hover:text-foreground border-transparent',
      )}
    >
      {children}
    </button>
  );
}
