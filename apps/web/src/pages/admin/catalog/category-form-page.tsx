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
import { AppError } from '@/lib/errors';
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
  }, [query.data, form]);

  const saveMutation = useMutation({
    mutationFn: (values: CategoryFormValues) =>
      cmsApi.categories.update(categoryId, {
        name: values.name.trim(),
        slug: values.slug?.trim() || undefined,
        description: values.description?.trim() || null,
        status: values.status,
        sortOrder: values.sortOrder ?? 0,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['cms', 'categories'] });
      toast.success('Category updated');
      void navigate({ to: ADMIN_ROUTES.categories });
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
      void queryClient.invalidateQueries({ queryKey: ['cms', 'categories'] });
      toast.success('Category image updated');
    } catch (error) {
      toast.error(error instanceof AppError ? error.message : 'Unable to upload image');
    } finally {
      setUploading(false);
    }
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
        description="Update the category name and homepage tile image."
        actions={
          <Link to={ADMIN_ROUTES.categories} className="admin-btn">
            Back to list
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

        <div className="flex justify-end gap-3">
          <Link to={ADMIN_ROUTES.categories} className="admin-btn">
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
