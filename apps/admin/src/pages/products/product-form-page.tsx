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
  if (value === 'variants' || value === 'prices' || value === 'stock' || value === 'details') {
    return value;
  }
  return 'details';
}

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
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: { name: '', slug: '', status: 'draft', shortDescription: '', description: '' },
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
      await navigate({ to: ADMIN_ROUTES.productDetail.replace('$productId', product.id) });
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

  const sectionHref = (value: ProductSection) => {
    if (!productId) return ADMIN_ROUTES.products;
    const base = ADMIN_ROUTES.productDetail.replace('$productId', productId);
    return value === 'details' ? base : `${base}?section=${value}`;
  };

  return (
    <PageMotion>
      <AdminPageHeader
        title={isEdit ? 'Edit product' : 'Create product'}
        description="Manage product details, variants, prices, and stock."
        actions={
          <>
            <Link
              to={ADMIN_ROUTES.products}
              className="inline-flex h-9 items-center rounded-lg border border-[var(--admin-line)] bg-white px-3.5 text-sm font-medium transition hover:bg-neutral-50"
            >
              Back to list
            </Link>
            {isEdit && productPerms.publish ? (
              <button
                type="button"
                className="inline-flex h-9 items-center rounded-lg border border-[var(--admin-line)] bg-white px-3.5 text-sm font-medium transition hover:bg-neutral-50 disabled:opacity-60"
                onClick={() => publishMutation.mutate()}
                disabled={publishMutation.isPending}
              >
                Publish
              </button>
            ) : null}
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
          {(
            [
              ['details', 'Details'],
              ['variants', 'Variants'],
              ['prices', 'Prices'],
              ['stock', 'Stock'],
            ] as const
          ).map(([value, label]) => (
            <a
              key={value}
              href={sectionHref(value)}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-medium transition',
                section === value
                  ? 'bg-[var(--admin-ink)] text-white'
                  : 'border border-[var(--admin-line)] bg-white text-neutral-600 hover:bg-neutral-50',
              )}
            >
              {label}
            </a>
          ))}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.25fr_1fr]">
        <form
          id="product-section-details"
          onSubmit={onSubmit}
          className={cn(
            'space-y-6',
            section === 'details' && isEdit && 'ring-[var(--admin-accent)]/30 rounded-2xl ring-2',
          )}
        >
          <AdminPanel title="Details">
            <div className="space-y-4">
              <AdminTextInput
                label="Name"
                registration={register('name')}
                error={errors.name}
                disabled={readOnly}
              />
              <AdminTextInput
                label="Slug"
                registration={register('slug')}
                error={errors.slug}
                disabled={readOnly}
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
                  className="inline-flex h-10 items-center rounded-lg bg-[var(--admin-ink)] px-4 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-60"
                >
                  {saveMutation.isPending ? 'Saving…' : 'Save product'}
                </button>
              ) : null}
            </div>
          </AdminPanel>
        </form>

        {isEdit && productId ? (
          <ProductCommercePanels
            productId={productId}
            section={section}
            canUpdate={productPerms.update}
            canCreate={productPerms.create}
            canDelete={productPerms.delete}
            canAdjustStock={inventory.adjust}
          />
        ) : (
          <AdminPanel title="Next steps">
            <p className="text-sm text-neutral-600">
              Save the product first, then add variants, set prices, and adjust stock from this
              page.
            </p>
          </AdminPanel>
        )}
      </div>
    </PageMotion>
  );
}
