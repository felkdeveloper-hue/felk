import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import {
  AdminErrorState,
  AdminPageHeader,
  AdminPanel,
  AdminSelect,
  AdminTextInput,
  AdminTextarea,
  PageMotion,
} from '@/components/admin';
import { ADMIN_ROUTES, QUERY_KEYS } from '@/constants';
import {
  CATALOG_FACET_DEFINITIONS,
  CATALOG_FACET_PRESETS,
  DEFAULT_CATALOG_FACET_KEYS,
  type CatalogFacetKey,
} from '@/constants/catalog-filter-facets';
import { AppError } from '@/lib/errors';
import { cn } from '@/lib/utils';
import { cmsApi } from '@/services/sdk/admin';

const categorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().optional(),
  description: z.string().optional(),
  status: z.string().default('active'),
  sortOrder: z.coerce.number().int().optional(),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

export function CategoryFormPage({ categoryId }: { categoryId: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [facetKeys, setFacetKeys] = useState<CatalogFacetKey[]>([...DEFAULT_CATALOG_FACET_KEYS]);

  const query = useQuery({
    queryKey: QUERY_KEYS.adminCms.resource('categories', { id: categoryId }),
    queryFn: () => cmsApi.categories.getById(categoryId),
    enabled: Boolean(categoryId),
  });

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      status: 'active',
      sortOrder: 0,
    },
  });

  useEffect(() => {
    if (!query.data) return;
    form.reset({
      name: query.data.name ?? '',
      slug: query.data.slug ?? '',
      description: typeof query.data.description === 'string' ? query.data.description : '',
      status: query.data.status ?? 'active',
      sortOrder: typeof query.data.sortOrder === 'number' ? query.data.sortOrder : 0,
    });
    setPreviewUrl(query.data.imageUrl ?? null);
    const saved = Array.isArray(query.data.filterFacetKeys)
      ? (query.data.filterFacetKeys as string[]).filter((key): key is CatalogFacetKey =>
          CATALOG_FACET_DEFINITIONS.some((def) => def.key === key),
        )
      : [];
    setFacetKeys(saved.length ? saved : [...DEFAULT_CATALOG_FACET_KEYS]);
  }, [query.data, form]);

  const saveMutation = useMutation({
    mutationFn: (values: CategoryFormValues) =>
      cmsApi.categories.update(categoryId, {
        name: values.name.trim(),
        slug: values.slug?.trim() || undefined,
        description: values.description?.trim() || null,
        status: values.status,
        sortOrder: values.sortOrder ?? 0,
        filterFacetKeys: facetKeys,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'cms', 'categories'] });
      void queryClient.invalidateQueries({ queryKey: ['cms', 'categories'] });
      toast.success('Category updated');
      void navigate({ to: ADMIN_ROUTES.filters, search: { tab: 'categories' } });
    },
    onError: (error) => {
      toast.error(error instanceof AppError ? error.message : 'Unable to update category');
    },
  });

  const onUpload = async (file: File) => {
    setUploading(true);
    try {
      const updated = await cmsApi.categories.uploadImage(categoryId, file, form.getValues('name'));
      setPreviewUrl(updated.imageUrl ?? null);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'cms', 'categories'] });
      void queryClient.invalidateQueries({ queryKey: ['cms', 'categories'] });
      toast.success('Category image updated');
    } catch (error) {
      toast.error(error instanceof AppError ? error.message : 'Unable to upload image');
    } finally {
      setUploading(false);
    }
  };

  const toggleFacet = (key: CatalogFacetKey) => {
    setFacetKeys((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key],
    );
  };

  if (query.isError) {
    return (
      <PageMotion>
        <AdminErrorState message="Unable to load category." onRetry={() => query.refetch()} />
      </PageMotion>
    );
  }

  return (
    <PageMotion>
      <AdminPageHeader
        title={query.data?.name ? `Edit ${query.data.name}` : 'Edit category'}
        description="Update category details, tile image, and which filters shoppers see on this category page."
        actions={
          <Link to={ADMIN_ROUTES.filters} search={{ tab: 'categories' }} className="admin-btn">
            Back to filters
          </Link>
        }
      />

      <form
        className="mx-auto grid max-w-3xl gap-6"
        onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}
      >
        <AdminPanel title="Details">
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminTextInput
              label="Name"
              registration={form.register('name')}
              error={form.formState.errors.name}
            />
            <AdminTextInput
              label="Slug"
              registration={form.register('slug')}
              error={form.formState.errors.slug}
            />
            <AdminSelect
              label="Status"
              registration={form.register('status')}
              error={form.formState.errors.status}
              options={[
                { label: 'Active', value: 'active' },
                { label: 'Draft', value: 'draft' },
                { label: 'Archived', value: 'archived' },
              ]}
            />
            <AdminTextInput
              label="Sort order"
              type="number"
              registration={form.register('sortOrder')}
              error={form.formState.errors.sortOrder}
            />
          </div>
          <div className="mt-4">
            <AdminTextarea
              label="Description"
              registration={form.register('description')}
              error={form.formState.errors.description}
            />
          </div>
        </AdminPanel>

        <AdminPanel title="Category image">
          <p className="mb-4 text-sm text-neutral-600 dark:text-neutral-400">
            This image appears on the storefront homepage categories grid.
          </p>
          <div className="flex flex-wrap items-start gap-4">
            <div className="relative aspect-[3/4] w-40 overflow-hidden rounded-xl border border-[var(--admin-line)] bg-[var(--admin-panel-soft)]">
              {previewUrl ? (
                <img src={previewUrl} alt="Category" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center px-3 text-center text-xs text-neutral-500">
                  No image yet
                </div>
              )}
            </div>
            <div className="space-y-2">
              <button
                type="button"
                className="admin-btn admin-btn-primary"
                disabled={uploading || query.isLoading}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? 'Uploading…' : previewUrl ? 'Replace image' : 'Upload image'}
              </button>
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
            </div>
          </div>
        </AdminPanel>

        <AdminPanel title="PLP filters (Bonkers-style)">
          <p className="mb-4 text-sm text-neutral-600 dark:text-neutral-400">
            Choose which filter sections appear when shoppers open this category. Fashion options
            like Fit / Rise / Neckline read from Product attributes on each product.
          </p>
          <div className="mb-4 flex flex-wrap gap-2">
            {Object.entries(CATALOG_FACET_PRESETS).map(([id, preset]) => (
              <button
                key={id}
                type="button"
                className="admin-btn"
                onClick={() => setFacetKeys([...preset.keys])}
              >
                Apply: {preset.label}
              </button>
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {CATALOG_FACET_DEFINITIONS.map((facet) => {
              const checked = facetKeys.includes(facet.key);
              return (
                <label
                  key={facet.key}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm',
                    checked
                      ? 'border-[var(--admin-accent)] bg-[var(--admin-panel-soft)]'
                      : 'border-[var(--admin-line)]',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleFacet(facet.key)}
                    className="accent-[var(--admin-accent)]"
                  />
                  <span>
                    {facet.label}
                    <span className="ml-2 text-[10px] uppercase tracking-wider text-neutral-500">
                      {facet.kind}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </AdminPanel>

        <div className="flex justify-end gap-3">
          <Link to={ADMIN_ROUTES.filters} search={{ tab: 'categories' }} className="admin-btn">
            Cancel
          </Link>
          <button
            type="submit"
            className="admin-btn admin-btn-primary"
            disabled={saveMutation.isPending || query.isLoading}
          >
            {saveMutation.isPending ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </PageMotion>
  );
}
