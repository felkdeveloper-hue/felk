import { useCallback, useMemo } from 'react';
import { useParams } from '@tanstack/react-router';
import { Seo } from '@/components/common/seo';
import { CatalogCategoryHero, CatalogListShell } from '@/components/catalog';
import { buildAbsoluteUrl, siteConfig } from '@/config';
import { useCatalogSearchParams, useCategoryBySlug, useInfiniteProducts } from '@/hooks/catalog';

export function CategoryDetailPage() {
  const { slug } = useParams({ strict: false }) as { slug: string };
  const categoryQuery = useCategoryBySlug(slug);
  const category = categoryQuery.data;

  const { state, setSearch, clearFilters } = useCatalogSearchParams();
  const mergedState = { ...state, categoryId: category?.id ?? state.categoryId };
  const query = useInfiniteProducts(mergedState);

  const products = useMemo(
    () => query.data?.pages.flatMap((page) => page.data) ?? [],
    [query.data?.pages],
  );

  const total = query.data?.pages[0]?.meta.total;
  const hasNextPage = Boolean(query.hasNextPage);

  const onLoadMore = useCallback(() => {
    if (!query.hasNextPage || query.isFetchingNextPage) return;
    void query.fetchNextPage();
  }, [query]);

  const heroTitle = category?.name ?? slug.replace(/-/g, ' ');

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

      <CatalogCategoryHero
        title={heroTitle}
        scopeKey={slug}
        imageUrl={category?.imageUrl}
        tagline={category?.description ?? undefined}
      />

      <CatalogListShell
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
