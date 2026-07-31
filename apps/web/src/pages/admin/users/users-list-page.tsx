import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  AdminErrorState,
  AdminPageHeader,
  AdminStatCard,
  DataTable,
  ListToolbar,
  PageMotion,
} from '@/components/admin';
import { PasswordField } from '@/components/forms/password-field';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { QUERY_KEYS } from '@/constants';
import { useAdminPermissions } from '@/hooks/admin';
import { AppError } from '@/lib/errors';
import { cn, formatDate } from '@/lib/utils';
import { usersApi, type AdminUserRow } from '@/services/sdk/admin';

const actionBtn = 'admin-btn';
const actionSecondary = 'admin-btn-secondary';
const actionDanger = 'admin-btn-danger';

const ROLE_OPTIONS = [
  { label: 'Customer', value: 'customer' },
  { label: 'Admin', value: 'admin' },
  { label: 'Super admin', value: 'super_admin' },
  { label: 'Manager', value: 'manager' },
  { label: 'Support', value: 'customer_support' },
  { label: 'Finance', value: 'finance' },
  { label: 'Inventory manager', value: 'inventory_manager' },
  { label: 'Marketing manager', value: 'marketing_manager' },
  { label: 'Warehouse staff', value: 'warehouse_staff' },
];

const STATUS_OPTIONS = [
  { label: 'Active', value: 'active' },
  { label: 'Locked', value: 'locked' },
  { label: 'Suspended', value: 'suspended' },
  { label: 'Pending verification', value: 'pending_verification' },
];

function displayName(row: AdminUserRow) {
  const first = row.firstName?.trim();
  const last = row.lastName?.trim();
  if (first && last && first.toLowerCase() !== last.toLowerCase()) return `${first} ${last}`;
  return first || last || row.email;
}

export function UsersListPage() {
  const queryClient = useQueryClient();
  const { users: userPerms, user: currentUser } = useAdminPermissions();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleKey, setRoleKey] = useState('');
  const [status, setStatus] = useState('');
  const [passwordTarget, setPasswordTarget] = useState<AdminUserRow | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

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

  const invalidateUsers = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
  };

  const query = useQuery({
    queryKey: QUERY_KEYS.adminUsers.list(params),
    queryFn: () => usersApi.list(params),
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
  });

  const summaryQueries = useQueries({
    queries: [
      {
        queryKey: QUERY_KEYS.adminUsers.list({ page: 1, limit: 1, summary: 'total' }),
        queryFn: () => usersApi.list({ page: 1, limit: 1 }),
      },
      {
        queryKey: QUERY_KEYS.adminUsers.list({ page: 1, limit: 1, roleKey: 'customer' }),
        queryFn: () => usersApi.list({ page: 1, limit: 1, roleKey: 'customer' }),
      },
      {
        queryKey: QUERY_KEYS.adminUsers.list({ page: 1, limit: 1, roleKey: 'admin' }),
        queryFn: () => usersApi.list({ page: 1, limit: 1, roleKey: 'admin' }),
      },
      {
        queryKey: QUERY_KEYS.adminUsers.list({ page: 1, limit: 1, status: 'active' }),
        queryFn: () => usersApi.list({ page: 1, limit: 1, status: 'active' }),
      },
    ],
  });

  const totalUsers = summaryQueries[0]?.data?.meta.total ?? 0;
  const customers = summaryQueries[1]?.data?.meta.total ?? 0;
  const admins = summaryQueries[2]?.data?.meta.total ?? 0;
  const active = summaryQueries[3]?.data?.meta.total ?? 0;

  const setPasswordMutation = useMutation({
    mutationFn: ({ userId, password }: { userId: string; password: string }) =>
      usersApi.setPassword(userId, password),
    onSuccess: () => {
      toast.success('Password updated');
      setPasswordTarget(null);
      setNewPassword('');
      setConfirmPassword('');
      invalidateUsers();
    },
    onError: (error) => {
      toast.error(AppError.isAppError(error) ? error.message : 'Unable to update password');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      userId,
      payload,
    }: {
      userId: string;
      payload: { status?: string; roleKey?: string };
    }) => usersApi.update(userId, payload),
    onSuccess: () => {
      toast.success('User updated');
      invalidateUsers();
    },
    onError: (error) => {
      toast.error(AppError.isAppError(error) ? error.message : 'Unable to update user');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => usersApi.remove(userId),
    onSuccess: () => {
      toast.success('User deleted');
      invalidateUsers();
    },
    onError: (error) => {
      toast.error(AppError.isAppError(error) ? error.message : 'Unable to delete user');
    },
  });

  const closePasswordDialog = () => {
    setPasswordTarget(null);
    setNewPassword('');
    setConfirmPassword('');
  };

  const submitPassword = () => {
    if (!passwordTarget) return;
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setPasswordMutation.mutate({ userId: passwordTarget.id, password: newPassword });
  };

  if (query.isError) {
    return <AdminErrorState message="Unable to load users." onRetry={() => query.refetch()} />;
  }

  return (
    <PageMotion>
      <AdminPageHeader
        title="Users"
        description="Manage accounts, set passwords, change roles/status, or delete users. Stored passwords stay hashed and cannot be viewed."
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
        statusOptions={STATUS_OPTIONS}
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
            {ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
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
                <p className="font-medium text-[var(--admin-ink)]">{displayName(row)}</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">{row.email}</p>
              </div>
            ),
          },
          {
            id: 'role',
            header: 'Role',
            cell: (row) =>
              userPerms.update ? (
                <select
                  value={row.roleKey}
                  disabled={updateMutation.isPending || row.id === currentUser?.id}
                  onChange={(event) =>
                    updateMutation.mutate({
                      userId: row.id,
                      payload: { roleKey: event.target.value },
                    })
                  }
                  className="max-w-[10rem] rounded-md border border-[var(--admin-line)] bg-[var(--admin-panel-soft)] px-2 py-1 text-xs capitalize text-[var(--admin-ink)]"
                >
                  {ROLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="inline-flex rounded-full bg-[var(--admin-panel-soft)] px-2 py-0.5 text-xs font-medium capitalize text-[var(--admin-ink)]">
                  {row.roleKey.replaceAll('_', ' ')}
                </span>
              ),
          },
          {
            id: 'status',
            header: 'Status',
            cell: (row) =>
              userPerms.lock || userPerms.update ? (
                <select
                  value={row.status}
                  disabled={updateMutation.isPending || row.id === currentUser?.id}
                  onChange={(event) =>
                    updateMutation.mutate({
                      userId: row.id,
                      payload: { status: event.target.value },
                    })
                  }
                  className="max-w-[11rem] rounded-md border border-[var(--admin-line)] bg-[var(--admin-panel-soft)] px-2 py-1 text-xs capitalize text-[var(--admin-ink)]"
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <span
                  className={cn(
                    'inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize',
                    row.status === 'active'
                      ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300'
                      : row.status === 'locked' || row.status === 'suspended'
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
                title="Passwords are hashed and never shown"
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
            id: 'country',
            header: 'Country',
            cell: (row) => row.lastLoginCountry || '—',
          },
          {
            id: 'device',
            header: 'Device',
            cell: (row) => row.lastLoginDevice || '—',
          },
          {
            id: 'created',
            header: 'Joined',
            cell: (row) => (row.createdAt ? formatDate(row.createdAt) : '—'),
          },
          {
            id: 'actions',
            header: 'Actions',
            cell: (row) => (
              <div className="flex flex-wrap items-center justify-end gap-1">
                {userPerms.update ? (
                  <button
                    type="button"
                    className={cn(actionBtn, actionSecondary)}
                    onClick={() => {
                      setPasswordTarget(row);
                      setNewPassword('');
                      setConfirmPassword('');
                    }}
                  >
                    Set password
                  </button>
                ) : null}
                {userPerms.delete && row.id !== currentUser?.id ? (
                  <button
                    type="button"
                    className={cn(actionBtn, actionDanger)}
                    disabled={deleteMutation.isPending}
                    onClick={() => {
                      if (
                        window.confirm(
                          `Delete “${displayName(row)}”? This cannot be undone from the admin list.`,
                        )
                      ) {
                        deleteMutation.mutate(row.id);
                      }
                    }}
                  >
                    Delete
                  </button>
                ) : null}
              </div>
            ),
          },
        ]}
      />

      <Dialog
        open={Boolean(passwordTarget)}
        onOpenChange={(open) => {
          if (!open) closePasswordDialog();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set password</DialogTitle>
            <DialogDescription>
              {passwordTarget
                ? `Set a new password for ${displayName(passwordTarget)}. The current password cannot be viewed — only replaced.`
                : null}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-[var(--admin-ink)]"
                htmlFor="admin-new-password"
              >
                New password
              </label>
              <PasswordField
                id="admin-new-password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
              <p className="text-muted-foreground text-xs">
                At least 8 characters with upper, lower, number, and special character.
              </p>
            </div>
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-[var(--admin-ink)]"
                htmlFor="admin-confirm-password"
              >
                Confirm password
              </label>
              <PasswordField
                id="admin-confirm-password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closePasswordDialog}>
              Cancel
            </Button>
            <Button type="button" loading={setPasswordMutation.isPending} onClick={submitPassword}>
              Save password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageMotion>
  );
}
