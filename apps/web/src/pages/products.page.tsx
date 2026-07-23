import { useCallback, useMemo } from 'react';
import { Seo } from '@/components/common/seo';
import { CatalogCategoryHero, CatalogListShell } from '@/components/catalog';
import { buildAbsoluteUrl, siteConfig } from '@/config';
import { useCatalogSearchParams, useInfiniteProducts } from '@/hooks/catalog';

const GENDER_META: Record<string, { title: string; description: string; scopeKey: string }> = {
  women: {
    title: 'Women',
    description: 'Shop the latest women edit.',
    scopeKey: 'women',
  },
  men: {
    title: 'Men',
    description: 'Shop the latest men edit.',
    scopeKey: 'men',
  },
};

export function ProductsPage() {
  const { state, setSearch, clearFilters } = useCatalogSearchParams();
  const query = useInfiniteProducts(state);

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

  const gender = state.gender;
  const meta = gender ? GENDER_META[gender] : undefined;

  const heroTitle = meta?.title ?? 'All Products';
  const heroScopeKey = meta?.scopeKey ?? 'women';

  return (
    <>
      <Seo
        title={meta?.title ?? 'Shop'}
        description={meta?.description ?? `Browse the full ${siteConfig.name} collection.`}
        url={buildAbsoluteUrl('/products')}
      />

      <CatalogCategoryHero title={heroTitle} scopeKey={heroScopeKey} />

      <CatalogListShell
        state={state}
        products={products}
        total={total}
        isLoading={query.isLoading}
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
