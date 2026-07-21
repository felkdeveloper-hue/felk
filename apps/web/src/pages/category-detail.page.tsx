import { useCallback, useMemo } from 'react';
import { Link, useParams } from '@tanstack/react-router';
import { Seo } from '@/components/common/seo';
import { CatalogHighlightRails, CatalogListShell } from '@/components/catalog';
import { Container } from '@/components/layout/container';
import { Image } from '@/components/media/image';
import { buildAbsoluteUrl, siteConfig } from '@/config';
import {
  useCatalogSearchParams,
  useCategoriesList,
  useCategoryBySlug,
  useInfiniteProducts,
} from '@/hooks/catalog';
import { CATALOG_MAX_PRODUCTS } from '@/utils/catalog';

export function CategoryDetailPage() {
  const { slug } = useParams({ strict: false }) as { slug: string };
  const categoryQuery = useCategoryBySlug(slug);
  const categoriesListQuery = useCategoriesList();
  const category = categoryQuery.data;
  const { state, setSearch, clearFilters } = useCatalogSearchParams();
  const mergedState = { ...state, categoryId: category?.id ?? state.categoryId };
  const query = useInfiniteProducts(mergedState);

  const products = useMemo(() => {
    const flat = query.data?.pages.flatMap((page) => page.data) ?? [];
    return flat.slice(0, CATALOG_MAX_PRODUCTS);
  }, [query.data?.pages]);

  const total = query.data?.pages[0]?.meta.total;
  const hasNextPage = Boolean(query.hasNextPage) && products.length < CATALOG_MAX_PRODUCTS;

  const onLoadMore = useCallback(() => {
    if (!query.hasNextPage || query.isFetchingNextPage) return;
    void query.fetchNextPage();
  }, [query]);

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

      <CatalogHighlightRails categoryId={category?.id} collectionLabel={category?.name} />

      <CatalogListShell
        eyebrow="Category"
        title={category?.name ?? 'Category'}
        description={category?.description}
        state={mergedState}
        products={products}
        total={total}
        isLoading={categoryQuery.isLoading || query.isLoading}
        isError={query.isError}
        isFetchingNextPage={query.isFetchingNextPage}
        hasNextPage={hasNextPage}
        onLoadMore={onLoadMore}
        onRetry={() => void query.refetch()}
        onSearchChange={setSearch}
        onClearFilters={clearFilters}
      />
    </>
  );
}
