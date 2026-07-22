import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useMemo, useRef, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { AdminErrorState, AdminPageHeader, DataTable, PageMotion } from '@/components/admin';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ADMIN_ROUTES, QUERY_KEYS } from '@/constants';
import { AppError } from '@/lib/errors';
import { cn, formatDate } from '@/lib/utils';
import { cmsApi, type CmsResource } from '@/services/sdk/admin';

type BannerTabId = 'hero' | 'split' | 'editorial' | 'before_featured';

const fieldClassName =
  'w-full rounded-lg border border-[var(--admin-line)] bg-[var(--admin-panel-soft)] px-3 py-2 text-sm text-[var(--admin-ink)] outline-none transition-colors focus:border-[var(--admin-accent)]/50';

const TABS: Array<{
  id: BannerTabId;
  label: string;
  title: string;
  description: string;
  kind: 'hero' | 'promo';
  placement?: string;
  hint: string;
}> = [
  {
    id: 'hero',
    label: 'Hero carousel',
    title: 'Hero banners',
    description: 'Full-screen carousel slides at the top of the home page.',
    kind: 'hero',
    hint: 'Priority order: highest number shows first. Choose an image when creating.',
  },
  {
    id: 'split',
    label: 'Split banners',
    title: 'Split banners',
    description: 'Side-by-side Bottoms / Tops tiles under the hero (same full height).',
    kind: 'promo',
    placement: 'home_split',
    hint: 'Create two active banners. Highest priority shows on the left. You can pick the image before saving.',
  },
  {
    id: 'editorial',
    label: 'Editorial',
    title: 'Editorial banner',
    description: 'Full-width banner under the split row.',
    kind: 'promo',
    placement: 'home_editorial',
    hint: 'The highest-priority active banner is shown on the storefront. You can pick the image before saving.',
  },
  {
    id: 'before_featured',
    label: 'Before featured',
    title: 'Before Featured Products',
    description: 'Full-screen banner shown above the Featured Products grid.',
    kind: 'promo',
    placement: 'home_before_featured',
    hint: 'Create one active banner. Highest priority wins. Choose an image before saving.',
  },
];

type FormState = {
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaUrl: string;
  imageUrl: string;
  priority: string;
  status: string;
};

const EMPTY_FORM: FormState = {
  title: '',
  subtitle: '',
  ctaLabel: 'Shop Now',
  ctaUrl: '/products?gender=women',
  imageUrl: '',
  priority: '10',
  status: 'active',
};

function isBannerTabId(value: unknown): value is BannerTabId {
  return TABS.some((tab) => tab.id === value);
}

function formFromRow(row: CmsResource): FormState {
  return {
    title: String(row.title ?? row.name ?? ''),
    subtitle: typeof row.subtitle === 'string' ? row.subtitle : '',
    ctaLabel: typeof row.ctaLabel === 'string' ? row.ctaLabel : 'Shop Now',
    ctaUrl: typeof row.ctaUrl === 'string' ? row.ctaUrl : '',
    imageUrl: row.imageUrl ?? '',
    priority: String(typeof row.priority === 'number' ? row.priority : 10),
    status: row.status ?? 'active',
  };
}

function buildImagesPayload(imageUrl: string, alt: string) {
  const url = imageUrl.trim();
  if (!url) return undefined;
  const image = { url, alt: alt || 'Banner image' };
  return { desktop: image, tablet: image, mobile: image };
}

function BannerTabPanel({ tab }: { tab: (typeof TABS)[number] }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CmsResource | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const api = tab.kind === 'hero' ? cmsApi.heroBanners : cmsApi.promoBanners;
  const resourceKey = tab.kind === 'hero' ? 'hero-banners' : 'promo-banners';

  const query = useQuery({
    queryKey: QUERY_KEYS.adminCms.resource(resourceKey, { placement: tab.placement }),
    queryFn: () =>
      api.list({
        limit: 50,
        sortBy: 'priority',
        sortOrder: 'desc',
        ...(tab.placement ? { placement: tab.placement } : {}),
      }),
  });

  const rows = useMemo(() => {
    const data = query.data?.data ?? [];
    if (!tab.placement) return data;
    return data.filter((row) => String(row.placement ?? '') === tab.placement);
  }, [query.data?.data, tab.placement]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminCms.resource(resourceKey) });
    void queryClient.invalidateQueries({ queryKey: ['cms', 'hero-banners'] });
    void queryClient.invalidateQueries({ queryKey: ['cms', 'promo-banners'] });
  };

  const saveMutation = useMutation({
    mutationFn: async (values: FormState) => {
      const existingId = editing?.id;
      const title = values.title.trim();
      const payload: Record<string, unknown> = {
        title,
        subtitle: values.subtitle.trim() || null,
        ctaLabel: values.ctaLabel.trim() || null,
        ctaUrl: values.ctaUrl.trim() || null,
        priority: Number(values.priority) || 0,
        status: values.status,
      };
      if (tab.placement) {
        payload.placement = tab.placement;
      }
      const images = buildImagesPayload(values.imageUrl, title);
      if (images) payload.images = images;

      let saved = existingId ? await api.update(existingId, payload) : await api.create(payload);

      if (pendingFile) {
        saved = await api.uploadImage(saved.id, pendingFile, title || undefined);
      }

      return { saved, wasCreate: !existingId };
    },
    onSuccess: () => {
      invalidate();
      toast.success('Banner saved');
      setPendingFile(null);
      setDialogOpen(false);
      setEditing(null);
      setForm(EMPTY_FORM);
      setPreviewUrl(null);
    },
    onError: (error) => {
      toast.error(error instanceof AppError ? error.message : 'Unable to save banner');
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => api.remove(id),
    onSuccess: () => {
      invalidate();
      toast.success('Banner deleted');
    },
    onError: (error) => {
      toast.error(error instanceof AppError ? error.message : 'Unable to delete banner');
    },
  });

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setPreviewUrl(null);
    setPendingFile(null);
    setDialogOpen(true);
  };

  const openEdit = (row: CmsResource) => {
    setEditing(row);
    setForm(formFromRow(row));
    setPreviewUrl(row.imageUrl ?? null);
    setPendingFile(null);
    setDialogOpen(true);
  };

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (form.imageUrl.trim() && !/^https?:\/\//i.test(form.imageUrl.trim())) {
      toast.error('Image URL must start with http:// or https:// (or upload a file)');
      return;
    }
    saveMutation.mutate(form);
  };

  const onUpload = async (file: File) => {
    // Prefer local preview immediately; upload on save for new banners,
    // or upload right away when editing an existing one.
    const objectUrl = URL.createObjectURL(file);
    setPendingFile(file);
    setPreviewUrl(objectUrl);

    if (!editing?.id) return;

    setUploading(true);
    try {
      const updated = await api.uploadImage(editing.id, file, form.title.trim() || undefined);
      setPendingFile(null);
      setPreviewUrl(updated.imageUrl ?? objectUrl);
      setForm((current) => ({ ...current, imageUrl: updated.imageUrl ?? current.imageUrl }));
      setEditing(updated);
      invalidate();
      toast.success('Image uploaded');
    } catch (error) {
      toast.error(error instanceof AppError ? error.message : 'Image upload failed');
    } finally {
      setUploading(false);
    }
  };

  if (query.isError) {
    return (
      <AdminErrorState
        message={query.error instanceof AppError ? query.error.message : 'Unable to load banners.'}
        onRetry={() => void query.refetch()}
      />
    );
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl text-[var(--admin-ink)]">{tab.title}</h2>
          <p className="text-sm text-[var(--admin-muted)]">{tab.description}</p>
          <p className="mt-1 text-xs text-[var(--admin-muted)]">{tab.hint}</p>
        </div>
        <button type="button" className="admin-btn admin-btn-primary" onClick={openCreate}>
          Add banner
        </button>
      </div>

      <DataTable
        columns={[
          {
            id: 'preview',
            header: 'Image',
            cell: (row) =>
              row.imageUrl ? (
                <img src={row.imageUrl} alt="" className="h-14 w-24 object-cover" />
              ) : (
                <span className="text-xs text-[var(--admin-muted)]">No image</span>
              ),
          },
          {
            id: 'title',
            header: 'Title',
            cell: (row) => (
              <div>
                <p className="font-medium text-[var(--admin-ink)]">
                  {String(row.title ?? row.name)}
                </p>
                {typeof row.subtitle === 'string' && row.subtitle ? (
                  <p className="text-xs text-[var(--admin-muted)]">{row.subtitle}</p>
                ) : null}
              </div>
            ),
          },
          {
            id: 'cta',
            header: 'CTA',
            cell: (row) => (
              <span className="text-xs text-[var(--admin-muted)]">
                {String(row.ctaLabel ?? '—')} → {String(row.ctaUrl ?? '—')}
              </span>
            ),
          },
          {
            id: 'priority',
            header: 'Priority',
            cell: (row) => String(row.priority ?? 0),
          },
          {
            id: 'status',
            header: 'Status',
            cell: (row) => (
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-xs capitalize',
                  row.status === 'active'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-neutral-100 text-neutral-600',
                )}
              >
                {row.status ?? 'draft'}
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
            header: '',
            cell: (row) => (
              <div className="flex justify-end gap-2" onClick={(event) => event.stopPropagation()}>
                <button
                  type="button"
                  className="admin-btn admin-btn-ghost"
                  onClick={() => openEdit(row)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn-ghost text-red-600"
                  onClick={() => {
                    if (window.confirm(`Delete “${String(row.title ?? row.name)}”?`)) {
                      removeMutation.mutate(row.id);
                    }
                  }}
                >
                  Delete
                </button>
              </div>
            ),
          },
        ]}
        data={rows}
        isLoading={query.isLoading}
        emptyMessage="No banners yet. Add one to control this home section."
        getRowId={(row) => row.id}
        onRowClick={openEdit}
      />

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditing(null);
            setForm(EMPTY_FORM);
            setPreviewUrl(null);
            setPendingFile(null);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit banner' : 'Add banner'}</DialogTitle>
            <DialogDescription>
              {tab.placement
                ? `Placement is locked to “${tab.placement}” for this tab.`
                : 'Hero carousel slide shown on the home page.'}
            </DialogDescription>
          </DialogHeader>

          <form className="grid gap-4" onSubmit={onSubmit}>
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-[var(--admin-ink)]">Title</span>
              <input
                className={fieldClassName}
                value={form.title}
                onChange={(e) => updateField('title', e.target.value)}
                required
                autoFocus
              />
            </label>
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-[var(--admin-ink)]">Subtitle / eyebrow</span>
              <input
                className={fieldClassName}
                value={form.subtitle}
                onChange={(e) => updateField('subtitle', e.target.value)}
              />
            </label>
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-[var(--admin-ink)]">CTA label</span>
              <input
                className={fieldClassName}
                value={form.ctaLabel}
                onChange={(e) => updateField('ctaLabel', e.target.value)}
              />
            </label>
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-[var(--admin-ink)]">CTA link</span>
              <input
                className={fieldClassName}
                value={form.ctaUrl}
                onChange={(e) => updateField('ctaUrl', e.target.value)}
                placeholder="/products?gender=women"
              />
            </label>
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-[var(--admin-ink)]">Image URL (optional)</span>
              <input
                className={fieldClassName}
                value={form.imageUrl}
                onChange={(e) => updateField('imageUrl', e.target.value)}
                placeholder="https://…"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1.5 text-sm">
                <span className="font-medium text-[var(--admin-ink)]">Priority</span>
                <input
                  className={fieldClassName}
                  type="number"
                  value={form.priority}
                  onChange={(e) => updateField('priority', e.target.value)}
                />
              </label>
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
            </div>

            <div className="rounded-lg border border-[var(--admin-line)] bg-[var(--admin-panel-soft)] p-3">
              <p className="mb-2 text-sm font-medium text-[var(--admin-ink)]">Banner image</p>
              {previewUrl ? (
                <img src={previewUrl} alt="" className="mb-3 h-36 w-full object-cover" />
              ) : (
                <p className="mb-3 text-xs text-[var(--admin-muted)]">
                  Choose an image file — it uploads when you save the banner.
                </p>
              )}
              {pendingFile ? (
                <p className="mb-2 text-xs text-[var(--admin-muted)]">
                  Selected: {pendingFile.name}
                  {editing ? '' : ' (uploads on create)'}
                </p>
              ) : null}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void onUpload(file);
                  event.target.value = '';
                }}
              />
              <button
                type="button"
                className="admin-btn"
                disabled={uploading || saveMutation.isPending}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? 'Uploading…' : previewUrl ? 'Change image' : 'Choose image'}
              </button>
            </div>

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
                  ? pendingFile
                    ? 'Saving & uploading…'
                    : 'Saving…'
                  : editing
                    ? 'Save changes'
                    : 'Create banner'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function BannersPage() {
  const navigate = useNavigate();
  const rawSearch = useSearch({ strict: false }) as { tab?: string };
  const activeTab = isBannerTabId(rawSearch.tab) ? rawSearch.tab : 'split';

  const onTabChange = (value: string) => {
    void navigate({
      to: ADMIN_ROUTES.banners,
      search: { tab: value },
      replace: true,
    });
  };

  return (
    <PageMotion>
      <AdminPageHeader
        title="Banners"
        description="Manage home hero, split, and editorial banners shown on the storefront."
      />

      <Tabs value={activeTab} onValueChange={onTabChange} className="mt-2">
        <TabsList className="mb-4 flex-wrap">
          {TABS.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {TABS.map((tab) => (
          <TabsContent key={tab.id} value={tab.id}>
            <BannerTabPanel tab={tab} />
          </TabsContent>
        ))}
      </Tabs>
    </PageMotion>
  );
}
