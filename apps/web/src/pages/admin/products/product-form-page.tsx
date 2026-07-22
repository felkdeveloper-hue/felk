import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useRouterState } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
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
import { cmsApi, productsApi, type ProductSpecification } from '@/services/sdk/admin';

const SPEC_PRESETS = [
  'Fit',
  'Neckline',
  'Pattern',
  'Sleeve length',
  'Length',
  'Rise',
  'Closure',
  'Fabric care',
  'Country of origin',
] as const;

/** Example values shown in the right-hand blank for each attribute type. */
const SPEC_VALUE_HINTS: Record<string, string> = {
  Fit: 'e.g. Slim Fit, Regular, Oversized',
  Neckline: 'e.g. Round Neck, V-Neck, Collar',
  Pattern: 'e.g. Plain, Printed, Striped',
  'Sleeve length': 'e.g. Short Sleeves, Full Sleeves',
  Length: 'e.g. Regular, Cropped, Longline',
  Rise: 'e.g. Mid Rise, High Rise',
  Closure: 'e.g. Button, Zip, Pull-on',
  'Fabric care': 'e.g. Machine Wash, Do not iron on print',
  'Country of origin': 'e.g. India, Sri Lanka',
};

function slugifyName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function masterDataCodeFromName(name: string): string {
  return slugifyName(name).toUpperCase().replace(/-/g, '_').slice(0, 32) || 'ITEM';
}

const productSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().optional(),
  status: z.string().default('draft'),
  visibility: z.string().default('public'),
  shortDescription: z.string().optional(),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  brandId: z.string().optional(),
  materialId: z.string().optional(),
  collectionId: z.string().optional(),
  gender: z.string().optional(),
  ageGroup: z.string().optional(),
  occasionId: z.string().optional(),
  tags: z.string().optional(),
  searchKeywords: z.string().optional(),
  price: z.string().optional(),
  salePrice: z.string().optional(),
  compareAtPrice: z.string().optional(),
  isFeatured: z.boolean().optional(),
  isTrending: z.boolean().optional(),
  isNewArrival: z.boolean().optional(),
  isBestSeller: z.boolean().optional(),
  isClearance: z.boolean().optional(),
  paymentOption: z.enum(['cod', 'prepaid', 'both']).default('both'),
  returnsAvailable: z.boolean().optional(),
  returnsCriteria: z.string().optional(),
  warrantyAvailable: z.boolean().optional(),
  warrantyDetails: z.string().optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
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

function splitCsv(value?: string): string[] {
  if (!value?.trim()) return [];
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseMoney(value?: string): number | undefined {
  if (!value?.trim()) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

function emptyToNull(value?: string): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function formatValidationDetails(details: unknown): string | undefined {
  if (!Array.isArray(details) || details.length === 0) return undefined;
  return details
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as { path?: string; message?: string };
      if (!row.message) return null;
      return row.path ? `${row.path}: ${row.message}` : row.message;
    })
    .filter(Boolean)
    .slice(0, 4)
    .join(' · ');
}

function FlagCheckbox({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--admin-line)] bg-[var(--admin-panel-soft)] px-3 py-2 text-sm">
      <input
        type="checkbox"
        className="size-4 accent-[var(--admin-accent)]"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="text-[var(--admin-ink)]">{label}</span>
    </label>
  );
}

export function ProductFormPage({ productId }: { productId?: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { products: productPerms, inventory } = useAdminPermissions();
  const isEdit = Boolean(productId);
  const searchStr = useRouterState({ select: (state) => state.location.searchStr });
  const section = useMemo(() => parseSection(searchStr), [searchStr]);
  const [specRows, setSpecRows] = useState<ProductSpecification[]>([
    { name: 'Fit', value: '' },
    { name: 'Fabric care', value: '' },
  ]);

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
  const materialsQuery = useQuery({
    queryKey: ['cms', 'materials', 'product-form'],
    queryFn: () => cmsApi.materials.list({ limit: 100, status: 'active' }),
  });
  const collectionsQuery = useQuery({
    queryKey: ['cms', 'collections', 'product-form'],
    queryFn: () => cmsApi.collections.list({ limit: 100, status: 'active' }),
  });

  const {
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      slug: '',
      status: 'draft',
      visibility: 'public',
      shortDescription: '',
      description: '',
      categoryId: '',
      brandId: '',
      materialId: '',
      collectionId: '',
      gender: '',
      ageGroup: '',
      occasionId: '',
      tags: '',
      searchKeywords: '',
      price: '',
      salePrice: '',
      compareAtPrice: '',
      isFeatured: false,
      isTrending: false,
      isNewArrival: false,
      isBestSeller: false,
      isClearance: false,
      paymentOption: 'both',
      returnsAvailable: true,
      returnsCriteria: '7-day easy returns & instant refunds on eligible items.',
      warrantyAvailable: false,
      warrantyDetails: '',
      seoTitle: '',
      seoDescription: '',
    },
  });

  const flags = {
    isFeatured: watch('isFeatured') ?? false,
    isTrending: watch('isTrending') ?? false,
    isNewArrival: watch('isNewArrival') ?? false,
    isBestSeller: watch('isBestSeller') ?? false,
    isClearance: watch('isClearance') ?? false,
    returnsAvailable: watch('returnsAvailable') ?? true,
    warrantyAvailable: watch('warrantyAvailable') ?? false,
  };

  const createAndSelect = async (
    resource: 'categories' | 'brands' | 'occasions' | 'materials',
    field: 'categoryId' | 'brandId' | 'occasionId' | 'materialId',
    name: string,
  ) => {
    try {
      const trimmed = name.trim();
      const payload: Record<string, unknown> = { name: trimmed, status: 'active' };
      // Colors / sizes / materials require a machine code — Filters admin auto-fills this.
      if (resource === 'materials') {
        payload.code = masterDataCodeFromName(trimmed);
        payload.slug = slugifyName(trimmed) || undefined;
      }
      const created = await cmsApi[resource].create(payload);
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
    if (!detailQuery.data) return;
    const product = detailQuery.data;
    reset({
      name: product.name,
      slug: product.slug,
      status: product.status,
      visibility: product.visibility ?? 'public',
      shortDescription: product.shortDescription ?? '',
      description: product.description ?? '',
      categoryId: product.categoryId ?? '',
      brandId: product.brandId ?? '',
      materialId: product.materialId ?? '',
      collectionId: product.collectionIds?.[0] ?? '',
      gender: product.gender ?? '',
      ageGroup: product.ageGroup ?? '',
      occasionId: product.occasionIds?.[0] ?? '',
      tags: product.tags?.join(', ') ?? '',
      searchKeywords: product.searchKeywords?.join(', ') ?? '',
      price: product.price != null ? String(product.price) : '',
      salePrice: product.salePrice != null ? String(product.salePrice) : '',
      compareAtPrice: product.compareAtPrice != null ? String(product.compareAtPrice) : '',
      isFeatured: product.isFeatured ?? false,
      isTrending: product.isTrending ?? false,
      isNewArrival: product.isNewArrival ?? false,
      isBestSeller: product.isBestSeller ?? false,
      isClearance: product.isClearance ?? false,
      paymentOption: product.paymentOption ?? 'both',
      returnsAvailable: product.returnsAvailable ?? true,
      returnsCriteria:
        product.returnsCriteria ?? '7-day easy returns & instant refunds on eligible items.',
      warrantyAvailable: product.warrantyAvailable ?? false,
      warrantyDetails: product.warrantyDetails ?? '',
      seoTitle: product.seoTitle ?? '',
      seoDescription: product.seoDescription ?? '',
    });
    setSpecRows(
      product.specifications?.length
        ? product.specifications
        : [
            { name: 'Fit', value: '' },
            { name: 'Fabric care', value: '' },
          ],
    );
  }, [detailQuery.data, reset]);

  const saveMutation = useMutation({
    mutationFn: (values: ProductFormValues) => {
      const price = parseMoney(values.price);
      const salePrice = parseMoney(values.salePrice);
      const compareAtPrice = parseMoney(values.compareAtPrice);
      const specifications = specRows
        .map((row, index) => ({
          name: row.name.trim(),
          value: row.value.trim(),
          group: row.group?.trim() || 'Product details',
          sortOrder: index,
        }))
        .filter((row) => row.name && row.value);

      const payload = {
        name: values.name.trim(),
        slug: values.slug?.trim() || undefined,
        status: values.status,
        visibility: values.visibility || 'public',
        shortDescription: values.shortDescription?.trim() || undefined,
        description: values.description?.trim() || undefined,
        categoryId: emptyToNull(values.categoryId),
        brandId: emptyToNull(values.brandId),
        materialId: emptyToNull(values.materialId),
        collectionIds: emptyToNull(values.collectionId) ? [emptyToNull(values.collectionId)!] : [],
        gender: emptyToNull(values.gender),
        ageGroup: emptyToNull(values.ageGroup),
        occasionIds: emptyToNull(values.occasionId) ? [emptyToNull(values.occasionId)!] : [],
        tags: splitCsv(values.tags),
        searchKeywords: splitCsv(values.searchKeywords),
        isFeatured: Boolean(values.isFeatured),
        isTrending: Boolean(values.isTrending),
        isNewArrival: Boolean(values.isNewArrival),
        isBestSeller: Boolean(values.isBestSeller),
        isClearance: Boolean(values.isClearance),
        paymentOption: values.paymentOption ?? 'both',
        returnsAvailable: Boolean(values.returnsAvailable),
        returnsCriteria: values.returnsAvailable ? values.returnsCriteria?.trim() || null : null,
        warrantyAvailable: Boolean(values.warrantyAvailable),
        warrantyDetails: values.warrantyAvailable ? values.warrantyDetails?.trim() || null : null,
        specifications,
        ...(values.seoTitle?.trim() || values.seoDescription?.trim()
          ? {
              seo: {
                title: values.seoTitle?.trim() || undefined,
                description: values.seoDescription?.trim() || undefined,
              },
            }
          : {}),
        ...(price != null
          ? {
              pricing: {
                price,
                salePrice: salePrice ?? null,
                compareAtPrice: compareAtPrice ?? null,
                currency: 'LKR',
              },
            }
          : {}),
      };

      return isEdit ? productsApi.update(productId!, payload) : productsApi.create(payload);
    },
    onSuccess: async (product) => {
      toast.success(isEdit ? 'Product saved' : 'Product created', {
        description: isEdit
          ? 'Listing details updated.'
          : 'Continue with images, variants, and stock.',
      });
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      if (isEdit) {
        await queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.products.detail(productId!),
        });
        return;
      }
      await navigate({
        to: `${ADMIN_ROUTES.productDetail.replace('$productId', product.id)}?section=images`,
      });
    },
    onError: (err) => {
      if (err instanceof AppError) {
        const detailText = formatValidationDetails(err.details);
        setError('name', { message: detailText || err.message });
        toast.error('Unable to save product', {
          description: detailText || err.message,
        });
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

  const toOptions = (placeholder: string, rows?: Array<{ id: string; name: string }>) => [
    { label: placeholder, value: '' },
    ...(rows?.map((item) => ({ label: item.name, value: item.id })) ?? []),
  ];

  const categoryOptions = toOptions('Select category', categoriesQuery.data?.data);
  const brandOptions = toOptions('Select brand', brandsQuery.data?.data);
  const occasionOptions = toOptions('Select occasion', occasionsQuery.data?.data);
  const materialOptions = toOptions('Select material / fabric', materialsQuery.data?.data);
  const collectionOptions = toOptions('Select collection', collectionsQuery.data?.data);

  const sectionHref = (value: ProductSection) => {
    if (!productId) return ADMIN_ROUTES.products;
    const base = ADMIN_ROUTES.productDetail.replace('$productId', productId);
    return value === 'details' ? base : `${base}?section=${value}`;
  };

  return (
    <PageMotion>
      <AdminPageHeader
        title={isEdit ? 'Edit product' : 'Add product'}
        description="List fashion products like a marketplace seller — details, attributes, pricing, images, and variants."
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
        <div className="mb-5 flex flex-wrap items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
          <span className="rounded-full bg-[var(--admin-ink)] px-2.5 py-1 font-medium text-[var(--admin-surface)]">
            1. Details
          </span>
          <span>→</span>
          <span>2. Images</span>
          <span>→</span>
          <span>3. Size &amp; color variants</span>
          <span>→</span>
          <span>4. Prices &amp; stock</span>
          <span>→</span>
          <span>5. Review &amp; publish</span>
        </div>
      )}

      <div className={cn('grid gap-6', isEdit && 'xl:grid-cols-[1.35fr_1fr]')}>
        <form
          id="product-section-details"
          onSubmit={onSubmit}
          className={cn(
            'space-y-6',
            section === 'details' && isEdit && 'ring-[var(--admin-accent)]/30 rounded-2xl ring-2',
            !isEdit && 'mx-auto w-full max-w-3xl',
          )}
        >
          <AdminPanel title="Basic information">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <AdminTextInput
                  label="Product name"
                  registration={register('name')}
                  error={errors.name}
                  disabled={readOnly}
                  placeholder="e.g. Men Slim Fit Cotton Shirt"
                />
              </div>
              <div className="block space-y-1.5 text-sm sm:col-span-2">
                <span className="font-medium text-neutral-700 dark:text-neutral-300">SKU</span>
                <div className="rounded-lg border border-dashed border-[var(--admin-line)] bg-[var(--admin-panel-soft)] px-3 py-2.5">
                  {isEdit && detailQuery.data?.sku ? (
                    <p className="font-mono text-sm font-semibold tracking-wide text-[var(--admin-ink)]">
                      {detailQuery.data.sku}
                    </p>
                  ) : (
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Auto-assigned on save (e.g. FE20261234). Size/color variants get linked SKUs.
                    </p>
                  )}
                </div>
              </div>
              <AdminTextInput
                label="URL slug"
                registration={register('slug')}
                error={errors.slug}
                disabled={readOnly}
                placeholder="auto-generated if blank"
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
              <AdminSelect
                label="Visibility"
                registration={register('visibility')}
                error={errors.visibility}
                disabled={readOnly}
                options={[
                  { label: 'Public (storefront)', value: 'public' },
                  { label: 'Catalog only', value: 'catalog_only' },
                  { label: 'Hidden', value: 'hidden' },
                ]}
              />
            </div>
          </AdminPanel>

          <AdminPanel title="Classification">
            <p className="mb-4 text-xs text-neutral-500 dark:text-neutral-400">
              These power storefront filters (Gender, Category, Brand, Occasion) — same idea as
              Myntra seller catalog attributes.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
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
                createPlaceholder="e.g. Roadster"
                onCreate={(name) => createAndSelect('brands', 'brandId', name)}
              />
              <AdminSelect
                label="Gender"
                registration={register('gender')}
                error={errors.gender}
                disabled={readOnly}
                options={[
                  { label: 'Select gender', value: '' },
                  { label: 'Women', value: 'women' },
                  { label: 'Men', value: 'men' },
                  { label: 'Unisex / All', value: 'unisex' },
                  { label: 'Boys', value: 'boys' },
                  { label: 'Girls', value: 'girls' },
                ]}
              />
              <AdminSelect
                label="Age group"
                registration={register('ageGroup')}
                error={errors.ageGroup}
                disabled={readOnly}
                options={[
                  { label: 'Select age group', value: '' },
                  { label: 'Adults', value: 'adults' },
                  { label: 'Teens', value: 'teens' },
                  { label: 'Kids', value: 'kids' },
                  { label: 'Infants', value: 'infants' },
                ]}
              />
              <AdminCreatableSelect
                label="Material / fabric"
                registration={register('materialId')}
                error={errors.materialId}
                disabled={readOnly}
                options={materialOptions}
                createLabel="Create material"
                createPlaceholder="e.g. Cotton"
                onCreate={(name) => createAndSelect('materials', 'materialId', name)}
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
              <div className="sm:col-span-2">
                <AdminSelect
                  label="Collection"
                  registration={register('collectionId')}
                  error={errors.collectionId}
                  disabled={readOnly}
                  options={collectionOptions}
                />
              </div>
            </div>
          </AdminPanel>

          <AdminPanel title="Description">
            <div className="space-y-4">
              <AdminTextarea
                label="Short description"
                registration={register('shortDescription')}
                error={errors.shortDescription}
                disabled={readOnly}
                placeholder="One-line pitch shown on listing cards"
                rows={2}
              />
              <AdminTextarea
                label="Full description"
                registration={register('description')}
                error={errors.description}
                disabled={readOnly}
                placeholder="Fabric, fit, styling tips, what’s included…"
                rows={6}
              />
            </div>
          </AdminPanel>

          <AdminPanel title="Product attributes">
            <p className="mb-4 text-xs text-neutral-500 dark:text-neutral-400">
              Left dropdown = what the attribute is (Pattern, Fit, Fabric care…). Right blank = the
              value customers see (e.g. Pattern → <span className="font-medium">Printed</span>,
              Fabric care → <span className="font-medium">Machine Wash</span>). These map to the
              Product Details grid on the storefront — same idea as Size &amp; Fit / Material &amp;
              Care on listing sites.
            </p>
            <div className="space-y-3">
              {specRows.map((row, index) => (
                <div key={`spec-${index}`} className="grid gap-2 sm:grid-cols-[1fr_1.4fr_auto]">
                  <select
                    className="w-full rounded-lg border border-[var(--admin-line)] bg-[var(--admin-panel-soft)] px-3 py-2 text-sm"
                    value={
                      SPEC_PRESETS.includes(row.name as (typeof SPEC_PRESETS)[number])
                        ? row.name
                        : '__custom'
                    }
                    disabled={readOnly}
                    onChange={(event) => {
                      const next = [...specRows];
                      next[index] = {
                        ...row,
                        name: event.target.value === '__custom' ? '' : event.target.value,
                      };
                      setSpecRows(next);
                    }}
                  >
                    {SPEC_PRESETS.map((preset) => (
                      <option key={preset} value={preset}>
                        {preset}
                      </option>
                    ))}
                    <option value="__custom">Custom attribute…</option>
                  </select>
                  {!SPEC_PRESETS.includes(row.name as (typeof SPEC_PRESETS)[number]) ? (
                    <input
                      className="w-full rounded-lg border border-[var(--admin-line)] bg-[var(--admin-panel-soft)] px-3 py-2 text-sm sm:col-start-1"
                      placeholder="Attribute name (e.g. Multipack Set)"
                      value={row.name}
                      disabled={readOnly}
                      onChange={(event) => {
                        const next = [...specRows];
                        next[index] = { ...row, name: event.target.value };
                        setSpecRows(next);
                      }}
                    />
                  ) : null}
                  <input
                    className="w-full rounded-lg border border-[var(--admin-line)] bg-[var(--admin-panel-soft)] px-3 py-2 text-sm"
                    placeholder={SPEC_VALUE_HINTS[row.name] ?? 'Value for this attribute'}
                    value={row.value}
                    disabled={readOnly}
                    onChange={(event) => {
                      const next = [...specRows];
                      next[index] = { ...row, value: event.target.value };
                      setSpecRows(next);
                    }}
                  />
                  {!readOnly ? (
                    <button
                      type="button"
                      className="admin-btn admin-btn-danger"
                      onClick={() => setSpecRows((rows) => rows.filter((_, i) => i !== index))}
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              ))}
              {!readOnly ? (
                <button
                  type="button"
                  className="admin-btn"
                  onClick={() => setSpecRows((rows) => [...rows, { name: 'Fit', value: '' }])}
                >
                  + Add attribute
                </button>
              ) : null}
            </div>
          </AdminPanel>

          <AdminPanel title="Pricing (MRP)">
            <p className="mb-4 text-xs text-neutral-500 dark:text-neutral-400">
              Set base listing price here. You can refine per size/color variant in the next steps.
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              <AdminTextInput
                label="Selling price (LKR)"
                type="number"
                min={0}
                step="0.01"
                registration={register('price')}
                error={errors.price}
                disabled={readOnly}
                placeholder="e.g. 4990"
              />
              <AdminTextInput
                label="Sale price (optional)"
                type="number"
                min={0}
                step="0.01"
                registration={register('salePrice')}
                error={errors.salePrice}
                disabled={readOnly}
                placeholder="e.g. 3990"
              />
              <AdminTextInput
                label="Compare-at / MRP"
                type="number"
                min={0}
                step="0.01"
                registration={register('compareAtPrice')}
                error={errors.compareAtPrice}
                disabled={readOnly}
                placeholder="Strike-through price"
              />
            </div>
          </AdminPanel>

          <AdminPanel title="Merchandising">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <FlagCheckbox
                label="New arrival"
                checked={flags.isNewArrival}
                disabled={readOnly}
                onChange={(v) => setValue('isNewArrival', v, { shouldDirty: true })}
              />
              <FlagCheckbox
                label="Featured"
                checked={flags.isFeatured}
                disabled={readOnly}
                onChange={(v) => setValue('isFeatured', v, { shouldDirty: true })}
              />
              <FlagCheckbox
                label="Trending"
                checked={flags.isTrending}
                disabled={readOnly}
                onChange={(v) => setValue('isTrending', v, { shouldDirty: true })}
              />
              <FlagCheckbox
                label="Best seller"
                checked={flags.isBestSeller}
                disabled={readOnly}
                onChange={(v) => setValue('isBestSeller', v, { shouldDirty: true })}
              />
              <FlagCheckbox
                label="Clearance / sale"
                checked={flags.isClearance}
                disabled={readOnly}
                onChange={(v) => setValue('isClearance', v, { shouldDirty: true })}
              />
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <AdminTextInput
                label="Tags"
                registration={register('tags')}
                error={errors.tags}
                disabled={readOnly}
                placeholder="summer, office, cotton (comma-separated)"
              />
              <AdminTextInput
                label="Search keywords"
                registration={register('searchKeywords')}
                error={errors.searchKeywords}
                disabled={readOnly}
                placeholder="shirt, formal, white"
              />
            </div>
          </AdminPanel>

          <AdminPanel title="Payment, returns & warranty">
            <p className="mb-4 text-xs text-neutral-500 dark:text-neutral-400">
              These options appear as trust badges on the product page (COD, returns, warranty).
            </p>
            <div className="space-y-5">
              <AdminSelect
                label="Payment options"
                registration={register('paymentOption')}
                error={errors.paymentOption}
                disabled={readOnly}
                options={[
                  { label: 'COD & Prepaid (both)', value: 'both' },
                  { label: 'Cash on Delivery (COD) available', value: 'cod' },
                  { label: 'Prepaid only (no COD)', value: 'prepaid' },
                ]}
              />

              <div className="space-y-3 rounded-xl border border-[var(--admin-line)] p-4">
                <FlagCheckbox
                  label="Returns & refunds available"
                  checked={flags.returnsAvailable}
                  disabled={readOnly}
                  onChange={(v) => setValue('returnsAvailable', v, { shouldDirty: true })}
                />
                {flags.returnsAvailable ? (
                  <AdminTextarea
                    label="Return / refund criteria"
                    registration={register('returnsCriteria')}
                    error={errors.returnsCriteria}
                    disabled={readOnly}
                    placeholder="e.g. 7-day return with original tags; refunds within 3–5 business days"
                    rows={3}
                  />
                ) : (
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Storefront will show that returns are not available for this product.
                  </p>
                )}
              </div>

              <div className="space-y-3 rounded-xl border border-[var(--admin-line)] p-4">
                <FlagCheckbox
                  label="Warranty available"
                  checked={flags.warrantyAvailable}
                  disabled={readOnly}
                  onChange={(v) => setValue('warrantyAvailable', v, { shouldDirty: true })}
                />
                {flags.warrantyAvailable ? (
                  <AdminTextarea
                    label="Warranty details"
                    registration={register('warrantyDetails')}
                    error={errors.warrantyDetails}
                    disabled={readOnly}
                    placeholder="e.g. 6-month manufacturer warranty against manufacturing defects"
                    rows={3}
                  />
                ) : (
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    No warranty badge will be shown for this product.
                  </p>
                )}
              </div>
            </div>
          </AdminPanel>

          <AdminPanel title="SEO">
            <div className="space-y-4">
              <AdminTextInput
                label="SEO title"
                registration={register('seoTitle')}
                error={errors.seoTitle}
                disabled={readOnly}
                placeholder="Defaults to product name"
              />
              <AdminTextarea
                label="SEO description"
                registration={register('seoDescription')}
                error={errors.seoDescription}
                disabled={readOnly}
                placeholder="Short meta description for search engines"
                rows={3}
              />
            </div>
          </AdminPanel>

          {!readOnly ? (
            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saveMutation.isPending}
                className="inline-flex h-11 items-center justify-center rounded-lg bg-[var(--admin-ink)] px-5 text-sm font-semibold text-[var(--admin-surface)] transition hover:opacity-90 disabled:opacity-60"
              >
                {saveMutation.isPending
                  ? 'Saving…'
                  : isEdit
                    ? 'Save product details'
                    : 'Save & continue to images →'}
              </button>
              {!isEdit ? (
                <p className="self-center text-xs text-neutral-500 dark:text-neutral-400">
                  Next: upload photos, then add size × color variants and stock.
                </p>
              ) : null}
            </div>
          ) : null}
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
