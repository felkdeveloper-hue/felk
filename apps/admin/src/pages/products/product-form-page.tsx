import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@fe-platform/ui';
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
import { usePermissions } from '@/hooks';
import { cmsApi, productsApi } from '@/services';

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

export function ProductFormPage({ productId }: { productId?: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { products: productPerms } = usePermissions();
  const isEdit = Boolean(productId);

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
      await navigate({ to: ADMIN_ROUTES.productDetail.replace('$productId', product.id) });
    },
  });

  const publishMutation = useMutation({
    mutationFn: () => productsApi.publish(productId!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  });

  const onSubmit = handleSubmit((values) => saveMutation.mutate(values));

  if (isEdit && detailQuery.isError) {
    return (
      <AdminErrorState message="Unable to load product." onRetry={() => detailQuery.refetch()} />
    );
  }

  const readOnly = isEdit && !productPerms.update;
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

  return (
    <PageMotion>
      <AdminPageHeader
        title={isEdit ? 'Edit product' : 'Create product'}
        description="Manage product details, category, variants, media, and SEO metadata."
        actions={
          <>
            <Link to={ADMIN_ROUTES.products}>
              <Button variant="outline" size="sm">
                Back to list
              </Button>
            </Link>
            {isEdit && productPerms.publish ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => publishMutation.mutate()}
                disabled={publishMutation.isPending}
              >
                Publish
              </Button>
            ) : null}
          </>
        }
      />

      <form onSubmit={onSubmit} className="grid gap-6 xl:grid-cols-[2fr_1fr]">
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
                { label: 'Published', value: 'published' },
                { label: 'Archived', value: 'archived' },
              ]}
            />
            <AdminSelect
              label="Category"
              registration={register('categoryId')}
              error={errors.categoryId}
              disabled={readOnly}
              options={categoryOptions}
            />
            <AdminSelect
              label="Brand"
              registration={register('brandId')}
              error={errors.brandId}
              disabled={readOnly}
              options={brandOptions}
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
            <AdminSelect
              label="Occasion"
              registration={register('occasionId')}
              error={errors.occasionId}
              disabled={readOnly}
              options={occasionOptions}
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
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving…' : 'Save product'}
              </Button>
            ) : null}
          </div>
        </AdminPanel>

        <div className="space-y-6">
          <AdminPanel title="Variants">
            <p className="text-sm text-neutral-600">
              Variant management UI connects to catalog variant endpoints.
            </p>
          </AdminPanel>
          <AdminPanel title="Media">
            <p className="text-sm text-neutral-600">
              Media manager placeholder for product images and assets. Upload multiple images so the
              storefront gallery can show thumbnails.
            </p>
          </AdminPanel>
          <AdminPanel title="SEO">
            <p className="text-sm text-neutral-600">
              Meta title, description, and canonical URL editor.
            </p>
          </AdminPanel>
        </div>
      </form>
    </PageMotion>
  );
}
