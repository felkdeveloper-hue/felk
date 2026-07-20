// @ts-nocheck
import { useQueries, useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import {
  AdminErrorState,
  AdminPageHeader,
  AdminStatCard,
  DataTable,
  ListToolbar,
  PageMotion,
} from '@/components/admin';
import { QUERY_KEYS } from '@/constants';
import { cn, formatDate } from '@/lib/utils';
import { usersApi } from '@/services';

export function UsersListPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleKey, setRoleKey] = useState('');
  const [status, setStatus] = useState('');

  const params = useMemo(
    () => ({
      page,
      limit: 20,
      q: search || undefined,
      roleKey: roleKey || undefined,
      status: status || undefined,
    }),
    [page, roleKey, search, status],
  );

  const query = useQuery({
    queryKey: QUERY_KEYS.users.list(params),
    queryFn: () => usersApi.list(params),
  });

  const summaryQueries = useQueries({
    queries: [
      {
        queryKey: QUERY_KEYS.users.list({ page: 1, limit: 1, summary: 'total' }),
        queryFn: () => usersApi.list({ page: 1, limit: 1 }),
      },
      {
        queryKey: QUERY_KEYS.users.list({ page: 1, limit: 1, roleKey: 'customer' }),
        queryFn: () => usersApi.list({ page: 1, limit: 1, roleKey: 'customer' }),
      },
      {
        queryKey: QUERY_KEYS.users.list({ page: 1, limit: 1, roleKey: 'admin' }),
        queryFn: () => usersApi.list({ page: 1, limit: 1, roleKey: 'admin' }),
      },
      {
        queryKey: QUERY_KEYS.users.list({ page: 1, limit: 1, status: 'active' }),
        queryFn: () => usersApi.list({ page: 1, limit: 1, status: 'active' }),
      },
    ],
  });

  const totalUsers = summaryQueries[0]?.data?.meta.total ?? 0;
  const customers = summaryQueries[1]?.data?.meta.total ?? 0;
  const admins = summaryQueries[2]?.data?.meta.total ?? 0;
  const active = summaryQueries[3]?.data?.meta.total ?? 0;

  if (query.isError) {
    return <AdminErrorState message="Unable to load users." onRetry={() => query.refetch()} />;
  }

  return (
    <PageMotion>
      <AdminPageHeader
        title="Users"
        description="All accounts with cart activity, purchase totals, and join date. Passwords stay hidden."
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard title="Total users" value={totalUsers} />
        <AdminStatCard title="Customers" value={customers} />
        <AdminStatCard title="Admins" value={admins} />
        <AdminStatCard title="Active" value={active} />
      </div>

      <ListToolbar
        search={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        searchPlaceholder="Search name or email…"
        status={status}
        onStatusChange={(value) => {
          setStatus(value);
          setPage(1);
        }}
        statusOptions={[
          { label: 'Active', value: 'active' },
          { label: 'Locked', value: 'locked' },
          { label: 'Pending verification', value: 'pending_verification' },
        ]}
        page={page}
        totalPages={query.data?.meta.totalPages ?? 1}
        onPageChange={setPage}
        bulkActions={
          <select
            value={roleKey}
            onChange={(event) => {
              setRoleKey(event.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-[var(--admin-line)] bg-[var(--admin-panel-soft)] px-3 py-2 text-sm text-[var(--admin-ink)]"
          >
            <option value="">All roles</option>
            <option value="customer">Customer</option>
            <option value="admin">Admin</option>
            <option value="super_admin">Super admin</option>
            <option value="customer_support">Support</option>
          </select>
        }
      />

      <DataTable
        data={query.data?.data ?? []}
        isLoading={query.isLoading}
        getRowId={(row) => row.id}
        emptyMessage="No users found."
        columns={[
          {
            id: 'user',
            header: 'User',
            cell: (row) => (
              <div>
                <p className="font-medium text-[var(--admin-ink)]">
                  {[row.firstName, row.lastName].filter(Boolean).join(' ') || '—'}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">{row.email}</p>
              </div>
            ),
          },
          {
            id: 'role',
            header: 'Role',
            cell: (row) => (
              <span className="inline-flex rounded-full bg-[var(--admin-panel-soft)] px-2 py-0.5 text-xs font-medium capitalize text-[var(--admin-ink)]">
                {row.roleKey.replaceAll('_', ' ')}
              </span>
            ),
          },
          {
            id: 'status',
            header: 'Status',
            cell: (row) => (
              <span
                className={cn(
                  'inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize',
                  row.status === 'active'
                    ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300'
                    : row.status === 'locked'
                      ? 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300'
                      : 'bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
                )}
              >
                {row.status.replaceAll('_', ' ')}
              </span>
            ),
          },
          {
            id: 'password',
            header: 'Password',
            cell: (row) => (
              <span
                className="font-mono text-sm tracking-widest text-neutral-600 dark:text-neutral-300"
                title="Passwords are never shown"
              >
                {row.passwordDisplay}
              </span>
            ),
          },
          {
            id: 'cart',
            header: 'Cart items',
            cell: (row) => row.cartItemCount,
          },
          {
            id: 'bought',
            header: 'Items bought',
            cell: (row) => row.purchasedItemCount,
          },
          {
            id: 'created',
            header: 'Joined',
            cell: (row) => (row.createdAt ? formatDate(row.createdAt) : '—'),
          },
        ]}
      />
    </PageMotion>
  );
}
