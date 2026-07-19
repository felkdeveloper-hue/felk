import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useRouterState } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  AdminErrorState,
  AdminPageHeader,
  AdminPanel,
  AdminSelect,
  AdminTextInput,
  AdminTextarea,
  PageMotion,
  ProductCommercePanels,
  type ProductSection,
} from '@/components/admin';
import { ADMIN_ROUTES, QUERY_KEYS } from '@/constants';
import { usePermissions } from '@/hooks';
import { AppError } from '@/lib/errors';
import { cn } from '@/lib/utils';
import { productsApi } from '@/services';

const productSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().optional(),
  status: z.string().default('draft'),
  shortDescription: z.string().optional(),
  description: z.string().optional(),
});

type ProductFormValues = z.infer<typeof productSchema>;

function parseSection(search: string): ProductSection {
  const value = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search).get(
    'section',
  );
  if (
    value === 'images' ||
    value === 'variants' ||
    value === 'prices' ||
    value === 'stock' ||
    value === 'review' ||
    value === 'details'
  ) {
    return value;
  }
  return 'details';
}

const STEPS: Array<[ProductSection, string]> = [
  ['details', 'Details'],
  ['images', 'Images'],
  ['variants', 'Variants'],
  ['prices', 'Prices'],
  ['stock', 'Stock'],
  ['review', 'Review & publish'],
];

export function ProductFormPage({ productId }: { productId?: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { products: productPerms, inventory } = usePermissions();
  const isEdit = Boolean(productId);
  const searchStr = useRouterState({ select: (state) => state.location.searchStr });
  const section = useMemo(() => parseSection(searchStr), [searchStr]);

  const detailQuery = useQuery({
    queryKey: QUERY_KEYS.products.detail(productId ?? ''),
    queryFn: () => productsApi.getById(productId!),
    enabled: isEdit,
  });

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      slug: '',
      status: 'draft',
      shortDescription: '',
      description: '',
    },
  });

  useEffect(() => {
    if (detailQuery.data) {
      reset({
        name: detailQuery.data.name,
        slug: detailQuery.data.slug,
        status: detailQuery.data.status,
        shortDescription: '',
        description: '',
      });
    }
  }, [detailQuery.data, reset]);

  const saveMutation = useMutation({
    mutationFn: (values: ProductFormValues) =>
      isEdit ? productsApi.update(productId!, values) : productsApi.create(values),
    onSuccess: async (product) => {
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      if (isEdit) return;
      await navigate({
        to: `${ADMIN_ROUTES.productDetail.replace('$productId', product.id)}?section=images`,
      });
    },
    onError: (err) => {
      if (err instanceof AppError) {
        setError('name', { message: err.message });
      }
    },
  });

  const publishMutation = useMutation({
    mutationFn: () => productsApi.publish(productId!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => productsApi.remove(productId!),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      await navigate({ to: ADMIN_ROUTES.products });
    },
  });

  const onSubmit = handleSubmit((values) => saveMutation.mutate(values));

  if (isEdit && detailQuery.isError) {
    return (
      <AdminErrorState message="Unable to load product." onRetry={() => detailQuery.refetch()} />
    );
  }

  const readOnly = isEdit && !productPerms.update;
  const isPublished = detailQuery.data?.status === 'published';

  const sectionHref = (value: ProductSection) => {
    if (!productId) return ADMIN_ROUTES.products;
    const base = ADMIN_ROUTES.productDetail.replace('$productId', productId);
    return value === 'details' ? base : `${base}?section=${value}`;
  };

  return (
    <PageMotion>
      <AdminPageHeader
        title={isEdit ? 'Edit product' : 'Add product'}
        description={
          isEdit
            ? 'Manage product details, images, variants, prices, and stock.'
            : 'Start with the basics — you\u2019ll add images, variants, and stock next.'
        }
        actions={
          <>
            <Link
              to={ADMIN_ROUTES.products}
              className="inline-flex h-9 items-center rounded-lg border border-[var(--admin-line)] bg-[var(--admin-panel)] px-3.5 text-sm font-medium text-[var(--admin-ink)] transition hover:bg-neutral-50 dark:hover:bg-white/10"
            >
              Back to list
            </Link>
            {isEdit && productPerms.delete ? (
              <button
                type="button"
                className="inline-flex h-9 items-center rounded-lg bg-red-600 px-3.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-60"
                onClick={() => {
                  if (window.confirm('Delete this product?')) deleteMutation.mutate();
                }}
                disabled={deleteMutation.isPending}
              >
                Delete
              </button>
            ) : null}
          </>
        }
      />

      {isEdit ? (
        <div className="mb-5 flex flex-wrap gap-2">
          {STEPS.map(([value, label]) => (
            <a
              key={value}
              href={sectionHref(value)}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-medium transition',
                section === value
                  ? 'bg-[var(--admin-ink)] text-[var(--admin-surface)]'
                  : 'border border-[var(--admin-line)] bg-[var(--admin-panel)] text-neutral-600 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-white/10',
              )}
            >
              {label}
            </a>
          ))}
        </div>
      ) : (
        <div className="mb-5 flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
          <span className="rounded-full bg-[var(--admin-ink)] px-2.5 py-1 font-medium text-[var(--admin-surface)]">
            1. Details
          </span>
          <span>→</span>
          <span>2. Images</span>
          <span>→</span>
          <span>3. Variants</span>
          <span>→</span>
          <span>4. Prices &amp; stock</span>
          <span>→</span>
          <span>5. Review &amp; publish</span>
        </div>
      )}

      <div className={cn('grid gap-6', isEdit && 'xl:grid-cols-[1.25fr_1fr]')}>
        <form
          id="product-section-details"
          onSubmit={onSubmit}
          className={cn(
            'space-y-6',
            section === 'details' && isEdit && 'ring-[var(--admin-accent)]/30 rounded-2xl ring-2',
            !isEdit && 'mx-auto w-full max-w-xl',
          )}
        >
          <AdminPanel title="Details">
            <div className="space-y-4">
              <AdminTextInput
                label="Product name"
                registration={register('name')}
                error={errors.name}
                disabled={readOnly}
                placeholder="e.g. Cloud Studio Sneaker"
              />
              <div className="block space-y-1.5 text-sm">
                <span className="font-medium text-neutral-700 dark:text-neutral-300">SKU</span>
                <div className="rounded-lg border border-dashed border-[var(--admin-line)] bg-[var(--admin-panel-soft)] px-3 py-2.5">
                  {isEdit && detailQuery.data?.sku ? (
                    <>
                      <p className="font-mono text-sm font-semibold tracking-wide text-[var(--admin-ink)]">
                        {detailQuery.data.sku}
                      </p>
                      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                        Auto-generated. Variant SKUs continue from this number.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-mono text-sm text-neutral-500 dark:text-neutral-400">
                        FE2026XXXX
                      </p>
                      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                        Assigned automatically when you save (e.g. FE20261234).
                      </p>
                    </>
                  )}
                </div>
              </div>
              <AdminTextInput
                label="Slug"
                registration={register('slug')}
                error={errors.slug}
                disabled={readOnly}
                placeholder="auto-generated if left blank"
              />
              <AdminSelect
                label="Status"
                registration={register('status')}
                error={errors.status}
                disabled={readOnly}
                options={[
                  { label: 'Draft', value: 'draft' },
                  { label: 'Active', value: 'active' },
                  { label: 'Published', value: 'published' },
                  { label: 'Archived', value: 'archived' },
                ]}
              />
              <AdminTextarea
                label="Short description"
                registration={register('shortDescription')}
                error={errors.shortDescription}
                disabled={readOnly}
              />
              <AdminTextarea
                label="Description"
                registration={register('description')}
                error={errors.description}
                disabled={readOnly}
              />
              {!readOnly ? (
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-[var(--admin-ink)] px-4 text-sm font-semibold text-[var(--admin-surface)] transition hover:opacity-90 disabled:opacity-60 sm:w-auto"
                >
                  {saveMutation.isPending
                    ? 'Saving…'
                    : isEdit
                      ? 'Save product'
                      : 'Continue to images →'}
                </button>
              ) : null}
            </div>
          </AdminPanel>
        </form>

        {isEdit && productId ? (
          <ProductCommercePanels
            productId={productId}
            productSku={detailQuery.data?.sku}
            productName={detailQuery.data?.name ?? 'this product'}
            section={section}
            canUpdate={productPerms.update}
            canCreate={productPerms.create}
            canDelete={productPerms.delete}
            canAdjustStock={inventory.adjust}
            canPublish={productPerms.publish}
            isPublished={isPublished}
            isPublishing={publishMutation.isPending}
            onPublish={() => publishMutation.mutate()}
          />
        ) : null}
      </div>
    </PageMotion>
  );
}
