import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useRouterState } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import {
  AdminCreatableSelect,
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
import { useAdminPermissions } from '@/hooks/admin';
import { AppError } from '@/lib/errors';
import { isProductLive } from '@/lib/product-status';
import { cn } from '@/lib/utils';
import { cmsApi, productsApi } from '@/services/sdk/admin';

const productSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().optional(),
  status: z.string().default('draft'),
  shortDescription: z.string().optional(),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  brandId: z.string().optional(),
  gender: z.string().optional(),
  occasionId: z.string().optional(),
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
  const { products: productPerms, inventory } = useAdminPermissions();
  const isEdit = Boolean(productId);
  const searchStr = useRouterState({ select: (state) => state.location.searchStr });
  const section = useMemo(() => parseSection(searchStr), [searchStr]);

  const detailQuery = useQuery({
    queryKey: QUERY_KEYS.products.detail(productId ?? ''),
    queryFn: () => productsApi.getById(productId!),
    enabled: isEdit,
  });

  const categoriesQuery = useQuery({
    queryKey: ['cms', 'categories', 'product-form'],
    queryFn: () => cmsApi.categories.list({ limit: 100, status: 'active' }),
  });

  const brandsQuery = useQuery({
    queryKey: ['cms', 'brands', 'product-form'],
    queryFn: () => cmsApi.brands.list({ limit: 100, status: 'active' }),
  });

  const occasionsQuery = useQuery({
    queryKey: ['cms', 'occasions', 'product-form'],
    queryFn: () => cmsApi.occasions.list({ limit: 100, status: 'active' }),
  });

  const {
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      slug: '',
      status: 'draft',
      shortDescription: '',
      description: '',
      categoryId: '',
      brandId: '',
      gender: '',
      occasionId: '',
    },
  });

  const createAndSelect = async (
    resource: 'categories' | 'brands' | 'occasions',
    field: 'categoryId' | 'brandId' | 'occasionId',
    name: string,
  ) => {
    try {
      const created = await cmsApi[resource].create({ name, status: 'active' });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['cms', resource, 'product-form'] }),
        queryClient.invalidateQueries({ queryKey: ['cms', resource] }),
      ]);
      setValue(field, created.id, { shouldDirty: true, shouldValidate: true });
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new Error(err instanceof Error ? err.message : 'Unable to create');
    }
  };

  useEffect(() => {
    if (detailQuery.data) {
      reset({
        name: detailQuery.data.name,
        slug: detailQuery.data.slug,
        status: detailQuery.data.status,
        shortDescription: detailQuery.data.shortDescription ?? '',
        description: detailQuery.data.description ?? '',
        categoryId: detailQuery.data.categoryId ?? '',
        brandId: detailQuery.data.brandId ?? '',
        gender: detailQuery.data.gender ?? '',
        occasionId: detailQuery.data.occasionIds?.[0] ?? '',
      });
    }
  }, [detailQuery.data, reset]);

  const saveMutation = useMutation({
    mutationFn: (values: ProductFormValues) => {
      const payload = {
        name: values.name,
        slug: values.slug || undefined,
        status: values.status,
        shortDescription: values.shortDescription || undefined,
        description: values.description || undefined,
        categoryId: values.categoryId || undefined,
        brandId: values.brandId || undefined,
        gender: values.gender || undefined,
        occasionIds: values.occasionId ? [values.occasionId] : undefined,
      };
      return isEdit ? productsApi.update(productId!, payload) : productsApi.create(payload);
    },
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
    onSuccess: async (product) => {
      toast.success('Product published', {
        description: `${product.name} is now live on the storefront.`,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['products'] }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products.detail(productId!) }),
      ]);
      reset((current) => ({ ...current, status: product.status }));
    },
    onError: (err) => {
      toast.error('Publish failed', {
        description:
          err instanceof AppError ? err.message : 'Unable to publish product. Please try again.',
      });
    },
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
  const isPublished = isProductLive(detailQuery.data?.status);

  const categoryOptions = [
    { label: 'Select category', value: '' },
    ...(categoriesQuery.data?.data.map((item) => ({
      label: item.name,
      value: item.id,
    })) ?? []),
  ];
  const brandOptions = [
    { label: 'Select brand', value: '' },
    ...(brandsQuery.data?.data.map((item) => ({
      label: item.name,
      value: item.id,
    })) ?? []),
  ];
  const occasionOptions = [
    { label: 'Select occasion', value: '' },
    ...(occasionsQuery.data?.data.map((item) => ({
      label: item.name,
      value: item.id,
    })) ?? []),
  ];

  const sectionHref = (value: ProductSection) => {
    if (!productId) return ADMIN_ROUTES.products;
    const base = ADMIN_ROUTES.productDetail.replace('$productId', productId);
    return value === 'details' ? base : `${base}?section=${value}`;
  };

  return (
    <PageMotion>
      <AdminPageHeader
        title={isEdit ? 'Edit product' : 'Create product'}
        description="Manage product details, category, variants, prices, and stock."
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
                  { label: 'Archived', value: 'archived' },
                ]}
              />
              <AdminCreatableSelect
                label="Category"
                registration={register('categoryId')}
                error={errors.categoryId}
                disabled={readOnly}
                options={categoryOptions}
                createLabel="Create category"
                createPlaceholder="e.g. Shirts"
                onCreate={(name) => createAndSelect('categories', 'categoryId', name)}
              />
              <AdminCreatableSelect
                label="Brand"
                registration={register('brandId')}
                error={errors.brandId}
                disabled={readOnly}
                options={brandOptions}
                createLabel="Create brand"
                createPlaceholder="e.g. Nike"
                onCreate={(name) => createAndSelect('brands', 'brandId', name)}
              />
              <AdminSelect
                label="Gender"
                registration={register('gender')}
                error={errors.gender}
                disabled={readOnly}
                options={[
                  { label: 'Unisex / All', value: '' },
                  { label: 'Women', value: 'women' },
                  { label: 'Men', value: 'men' },
                ]}
              />
              <AdminCreatableSelect
                label="Occasion"
                registration={register('occasionId')}
                error={errors.occasionId}
                disabled={readOnly}
                options={occasionOptions}
                createLabel="Create occasion"
                createPlaceholder="e.g. Casual"
                onCreate={(name) => createAndSelect('occasions', 'occasionId', name)}
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
            productPrice={detailQuery.data?.price}
            productSalePrice={detailQuery.data?.salePrice}
            productCurrency={detailQuery.data?.currency}
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
