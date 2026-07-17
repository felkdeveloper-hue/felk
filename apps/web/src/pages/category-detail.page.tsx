import { Link, useParams } from '@tanstack/react-router';
import { Seo } from '@/components/common/seo';
import { CatalogListShell } from '@/components/catalog';
import { Container } from '@/components/layout/container';
import { Image } from '@/components/media/image';
import { buildAbsoluteUrl, siteConfig } from '@/config';
import {
  useCatalogSearchParams,
  useCategoriesList,
  useCategoryBySlug,
  useProductsList,
} from '@/hooks/catalog';

export function CategoryDetailPage() {
  const { slug } = useParams({ strict: false }) as { slug: string };
  const categoryQuery = useCategoryBySlug(slug);
  const categoriesListQuery = useCategoriesList();
  const category = categoryQuery.data;
  const { state, setSearch, clearFilters } = useCatalogSearchParams();
  const mergedState = { ...state, categoryId: category?.id ?? state.categoryId };
  const productsQuery = useProductsList(mergedState);

  const subcategories =
    categoriesListQuery.data?.data.filter((item) => item.parentId === category?.id) ?? [];

  return (
    <>
      <Seo
        title={category?.name ?? 'Category'}
        description={
          category?.description ?? `Shop ${category?.name ?? 'category'} at ${siteConfig.name}.`
        }
        image={category?.imageUrl}
        url={buildAbsoluteUrl(`/categories/${slug}`)}
      />

      {category?.imageUrl ? (
        <Container className="pt-8">
          <div className="overflow-hidden rounded-3xl">
            <Image src={category.imageUrl} alt={category.name} aspectRatio="21/9" />
          </div>
        </Container>
      ) : null}

      {subcategories.length ? (
        <Container className="pt-6">
          <div className="flex flex-wrap gap-3">
            {subcategories.map((subcategory) => (
              <Link
                key={subcategory.id}
                to="/categories/$slug"
                params={{ slug: subcategory.slug }}
                preload="intent"
                className="border-border hover:bg-muted rounded-full border px-4 py-2 text-sm"
              >
                {subcategory.name}
              </Link>
            ))}
          </div>
        </Container>
      ) : null}

      <CatalogListShell
        eyebrow="Category"
        title={category?.name ?? 'Category'}
        description={category?.description}
        state={mergedState}
        products={productsQuery.data?.data ?? []}
        total={productsQuery.data?.meta.total}
        totalPages={productsQuery.data?.meta.totalPages}
        isLoading={categoryQuery.isLoading || productsQuery.isLoading}
        isError={productsQuery.isError}
        onRetry={() => void productsQuery.refetch()}
        onSearchChange={setSearch}
        onClearFilters={clearFilters}
      />
    </>
  );
}
