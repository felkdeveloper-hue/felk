import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useMemo, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import {
  AdminErrorState,
  AdminPageHeader,
  DataTable,
  ListToolbar,
  PageMotion,
} from '@/components/admin';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { QUERY_KEYS } from '@/constants';
import { AppError } from '@/lib/errors';
import { cn, formatDate } from '@/lib/utils';
import type { createCmsResourceApi } from '@/services/sdk/admin';
import type { CmsResource } from '@/services/sdk/admin';

type CmsApi = ReturnType<typeof createCmsResourceApi>;

type FormState = {
  name: string;
  slug: string;
  description: string;
  status: string;
  sortOrder: string;
  code: string;
  hex: string;
  website: string;
  chart: string;
};

const EMPTY_FORM: FormState = {
  name: '',
  slug: '',
  description: '',
  status: 'active',
  sortOrder: '0',
  code: '',
  hex: '',
  website: '',
  chart: '',
};

function singularLabel(title: string): string {
  if (title.toLowerCase().endsWith('ies')) return `${title.slice(0, -3)}y`;
  if (title.toLowerCase().endsWith('s')) return title.slice(0, -1);
  return title;
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function needsCode(resourceKey: string): boolean {
  return resourceKey === 'colors' || resourceKey === 'sizes' || resourceKey === 'materials';
}

function needsHex(resourceKey: string): boolean {
  return resourceKey === 'colors';
}

function needsWebsite(resourceKey: string): boolean {
  return resourceKey === 'brands';
}

function needsChart(resourceKey: string): boolean {
  return resourceKey === 'sizes';
}

function formFromResource(row: CmsResource): FormState {
  return {
    name: row.name ?? '',
    slug: row.slug ?? '',
    description: typeof row.description === 'string' ? row.description : '',
    status: row.status ?? 'active',
    sortOrder: String(typeof row.sortOrder === 'number' ? row.sortOrder : 0),
    code: typeof row.code === 'string' ? row.code : '',
    hex: typeof row.hex === 'string' ? row.hex : '',
    website: typeof row.website === 'string' ? row.website : '',
    chart: typeof row.chart === 'string' ? row.chart : '',
  };
}

function buildPayload(resourceKey: string, form: FormState): Record<string, unknown> {
  const name = form.name.trim();
  const payload: Record<string, unknown> = {
    name,
    slug: form.slug.trim() || slugify(name) || undefined,
    description: form.description.trim() || null,
    status: form.status || 'active',
    sortOrder: Number.parseInt(form.sortOrder, 10) || 0,
  };

  if (needsCode(resourceKey)) {
    payload.code = form.code.trim() || slugify(name).toUpperCase().replace(/-/g, '_').slice(0, 32);
  }
  if (needsHex(resourceKey)) {
    payload.hex = form.hex.trim() || null;
  }
  if (needsWebsite(resourceKey)) {
    payload.website = form.website.trim() || null;
  }
  if (needsChart(resourceKey)) {
    payload.chart = form.chart.trim() || null;
  }

  return payload;
}

const fieldClassName =
  'w-full rounded-lg border border-[var(--admin-line)] bg-[var(--admin-panel-soft)] px-3 py-2 text-sm text-[var(--admin-ink)] outline-none transition-colors focus:border-[var(--admin-accent)]/50';

export function CmsResourceListPage({
  title,
  description,
  resourceKey,
  api,
  canCreate,
  canDelete,
  detailPath,
  showImage,
  embedded = false,
}: {
  title: string;
  description: string;
  resourceKey: string;
  api: CmsApi;
  canCreate?: boolean;
  canDelete?: boolean;
  detailPath?: string;
  showImage?: boolean;
  /** When true, omits the page header wrapper for use inside tabbed layouts. */
  embedded?: boolean;
}) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CmsResource | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [slugTouched, setSlugTouched] = useState(false);

  const itemLabel = singularLabel(title);

  const params = useMemo(
    () => ({
      page,
      limit: 20,
      q: search || undefined,
      status: status || undefined,
    }),
    [page, search, status],
  );

  const listQueryKey = QUERY_KEYS.adminCms.resource(resourceKey, params);

  const query = useQuery({
    queryKey: listQueryKey,
    queryFn: () => api.list(params),
  });

  const invalidateList = () =>
    queryClient.invalidateQueries({ queryKey: ['admin', 'cms', resourceKey] });

  const removeMutation = useMutation({
    mutationFn: (id: string) => api.remove(id),
    onSuccess: () => {
      void invalidateList();
      toast.success(`${itemLabel} deleted`);
    },
    onError: (error) => {
      toast.error(error instanceof AppError ? error.message : `Unable to delete ${itemLabel}`);
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      if (editing) return api.update(editing.id, payload);
      return api.create(payload);
    },
    onSuccess: () => {
      void invalidateList();
      toast.success(editing ? `${itemLabel} updated` : `${itemLabel} created`);
      setDialogOpen(false);
      setEditing(null);
      setForm(EMPTY_FORM);
      setSlugTouched(false);
    },
    onError: (error) => {
      toast.error(
        error instanceof AppError
          ? error.message
          : `Unable to ${editing ? 'update' : 'create'} ${itemLabel}`,
      );
    },
  });

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setSlugTouched(false);
    setDialogOpen(true);
  };

  const openEdit = (row: CmsResource) => {
    setEditing(row);
    setForm(formFromResource(row));
    setSlugTouched(true);
    setDialogOpen(true);
  };

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (key === 'name' && !slugTouched && !editing) {
        const slug = slugify(String(value));
        next.slug = slug;
        if (needsCode(resourceKey)) {
          next.code = slug.toUpperCase().replace(/-/g, '_').slice(0, 32);
        }
      }
      return next;
    });
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) {
      toast.error('Name is required');
      return;
    }
    if (needsCode(resourceKey) && !form.code.trim()) {
      toast.error('Code is required');
      return;
    }
    saveMutation.mutate(buildPayload(resourceKey, form));
  };

  const toggleRow = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  };

  const toggleAll = () => {
    const rows = query.data?.data ?? [];
    setSelectedIds((current) => (current.length === rows.length ? [] : rows.map((row) => row.id)));
  };

  const bulkDelete = async () => {
    await Promise.all(selectedIds.map((id) => removeMutation.mutateAsync(id)));
    setSelectedIds([]);
  };

  const createButton = canCreate ? (
    <button
      type="button"
      className={cn('admin-btn admin-btn-primary', !embedded && 'admin-btn-lg')}
      onClick={openCreate}
    >
      Create {itemLabel}
    </button>
  ) : null;

  const dialog = (
    <Dialog
      open={dialogOpen}
      onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) {
          setEditing(null);
          setForm(EMPTY_FORM);
          setSlugTouched(false);
        }
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? `Edit ${itemLabel}` : `Create ${itemLabel}`}</DialogTitle>
          <DialogDescription>
            {editing
              ? `Update this ${itemLabel.toLowerCase()} and save to refresh the list.`
              : `Fill in the details below. It will appear in the list as soon as you save.`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="grid gap-4">
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-[var(--admin-ink)]">Name</span>
            <input
              className={fieldClassName}
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder={`e.g. ${itemLabel}`}
              autoFocus
              required
            />
          </label>

          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-[var(--admin-ink)]">Slug</span>
            <input
              className={fieldClassName}
              value={form.slug}
              onChange={(e) => {
                setSlugTouched(true);
                updateField('slug', e.target.value);
              }}
              placeholder="auto-generated-from-name"
            />
          </label>

          {needsCode(resourceKey) ? (
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-[var(--admin-ink)]">Code</span>
              <input
                className={fieldClassName}
                value={form.code}
                onChange={(e) => updateField('code', e.target.value)}
                placeholder="e.g. BLK, M, COTTON"
                required
              />
            </label>
          ) : null}

          {needsHex(resourceKey) ? (
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-[var(--admin-ink)]">Hex color</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  className="size-10 shrink-0 cursor-pointer rounded border border-[var(--admin-line)] bg-transparent p-0.5"
                  value={/^#[0-9a-fA-F]{6}$/.test(form.hex) ? form.hex : '#000000'}
                  onChange={(e) => updateField('hex', e.target.value)}
                />
                <input
                  className={fieldClassName}
                  value={form.hex}
                  onChange={(e) => updateField('hex', e.target.value)}
                  placeholder="#000000"
                />
              </div>
            </label>
          ) : null}

          {needsWebsite(resourceKey) ? (
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-[var(--admin-ink)]">Website</span>
              <input
                className={fieldClassName}
                type="url"
                value={form.website}
                onChange={(e) => updateField('website', e.target.value)}
                placeholder="https://"
              />
            </label>
          ) : null}

          {needsChart(resourceKey) ? (
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-[var(--admin-ink)]">Size chart</span>
              <input
                className={fieldClassName}
                value={form.chart}
                onChange={(e) => updateField('chart', e.target.value)}
                placeholder="Optional chart note"
              />
            </label>
          ) : null}

          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-[var(--admin-ink)]">Description</span>
            <textarea
              className={cn(fieldClassName, 'min-h-20')}
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Optional"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-[var(--admin-ink)]">Status</span>
              <select
                className={fieldClassName}
                value={form.status}
                onChange={(e) => updateField('status', e.target.value)}
              >
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="inactive">Inactive</option>
                <option value="archived">Archived</option>
              </select>
            </label>

            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-[var(--admin-ink)]">Sort order</span>
              <input
                className={fieldClassName}
                type="number"
                value={form.sortOrder}
                onChange={(e) => updateField('sortOrder', e.target.value)}
              />
            </label>
          </div>

          {editing && detailPath ? (
            <p className="text-xs text-[var(--admin-muted)]">
              Need to manage the image?{' '}
              <Link
                to={detailPath.replace('$categoryId', editing.id).replace('$id', editing.id)}
                className="text-[var(--admin-ink)] underline"
                onClick={() => setDialogOpen(false)}
              >
                Open full editor
              </Link>
            </p>
          ) : null}

          <DialogFooter>
            <button
              type="button"
              className="admin-btn"
              onClick={() => setDialogOpen(false)}
              disabled={saveMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="admin-btn admin-btn-primary"
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending
                ? 'Saving…'
                : editing
                  ? 'Save changes'
                  : `Create ${itemLabel}`}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );

  const content = (
    <>
      {!embedded ? (
        <AdminPageHeader title={title} description={description} actions={createButton} />
      ) : null}

      {query.isError ? (
        <AdminErrorState message="Unable to load records." onRetry={() => query.refetch()} />
      ) : (
        <>
          {embedded && createButton ? (
            <div className="mb-4 flex justify-end">{createButton}</div>
          ) : null}

          <ListToolbar
            search={search}
            onSearchChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            status={status}
            onStatusChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
            statusOptions={[
              { label: 'Draft', value: 'draft' },
              { label: 'Active', value: 'active' },
              { label: 'Published', value: 'published' },
              { label: 'Archived', value: 'archived' },
            ]}
            page={page}
            totalPages={query.data?.meta.totalPages ?? 1}
            onPageChange={setPage}
            bulkActions={
              canDelete && selectedIds.length > 0 ? (
                <button
                  type="button"
                  className="admin-btn bg-red-600 text-white hover:bg-red-700"
                  onClick={() => void bulkDelete()}
                >
                  Delete selected ({selectedIds.length})
                </button>
              ) : null
            }
          />

          <DataTable<CmsResource>
            data={query.data?.data ?? []}
            isLoading={query.isLoading}
            selectedIds={canDelete ? selectedIds : undefined}
            onToggleRow={canDelete ? toggleRow : undefined}
            onToggleAll={canDelete ? toggleAll : undefined}
            getRowId={(row) => row.id}
            emptyMessage={`No ${title.toLowerCase()} yet.`}
            columns={[
              ...(showImage
                ? [
                    {
                      id: 'image',
                      header: 'Image',
                      cell: (row: CmsResource) =>
                        row.imageUrl ? (
                          <img
                            src={row.imageUrl}
                            alt={row.name || itemLabel}
                            className="size-12 rounded-lg object-cover"
                          />
                        ) : (
                          <span className="text-xs text-neutral-500">No image</span>
                        ),
                    },
                  ]
                : []),
              {
                id: 'name',
                header: 'Name',
                cell: (row) => (
                  <button
                    type="button"
                    className="font-medium text-[var(--admin-ink)] hover:underline"
                    onClick={() => openEdit(row)}
                  >
                    {row.name || '—'}
                  </button>
                ),
              },
              { id: 'slug', header: 'Slug / key', cell: (row) => row.slug ?? '—' },
              {
                id: 'status',
                header: 'Status',
                cell: (row) => (
                  <span
                    className={cn(
                      'inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize',
                      'bg-[var(--admin-panel-soft)] text-[var(--admin-ink)]',
                    )}
                  >
                    {row.status ?? '—'}
                  </span>
                ),
              },
              {
                id: 'updated',
                header: 'Updated',
                cell: (row) => (row.updatedAt ? formatDate(row.updatedAt) : '—'),
              },
              {
                id: 'actions',
                header: 'Actions',
                cell: (row) => (
                  <div className="flex items-center gap-2">
                    <button type="button" className="admin-btn" onClick={() => openEdit(row)}>
                      Edit
                    </button>
                    {canDelete ? (
                      <button
                        type="button"
                        className="admin-btn admin-btn-danger"
                        onClick={() => {
                          if (window.confirm(`Delete “${row.name || row.id}”?`)) {
                            removeMutation.mutate(row.id);
                          }
                        }}
                        disabled={removeMutation.isPending}
                      >
                        Delete
                      </button>
                    ) : null}
                  </div>
                ),
              },
            ]}
          />
        </>
      )}

      {dialog}
    </>
  );

  if (embedded) {
    return content;
  }

  return <PageMotion>{content}</PageMotion>;
}
