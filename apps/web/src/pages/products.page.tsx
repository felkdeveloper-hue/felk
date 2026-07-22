import { useCallback, useMemo } from 'react';
import { Seo } from '@/components/common/seo';
import { CatalogHighlightRails, CatalogListShell } from '@/components/catalog';
import { buildAbsoluteUrl, siteConfig } from '@/config';
import { useCatalogSearchParams, useInfiniteProducts } from '@/hooks/catalog';
import { CATALOG_MAX_PRODUCTS } from '@/utils/catalog';

export function ProductsPage() {
  const { state, setSearch, clearFilters } = useCatalogSearchParams();
  const query = useInfiniteProducts(state);

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

  return (
    <>
      <Seo
        title="Shop"
        description={`Browse the full ${siteConfig.name} collection.`}
        url={buildAbsoluteUrl('/products')}
      />
      <CatalogHighlightRails />
      <CatalogListShell
        eyebrow="Catalog"
        title={
          state.gender === 'men'
            ? "Shop men's collection"
            : state.gender === 'women'
              ? "Shop women's collection"
              : 'All products'
        }
        description={
          state.gender === 'men'
            ? 'Shop the latest men edit.'
            : state.gender === 'women'
              ? 'Shop the latest women edit.'
              : 'Discover considered pieces designed for everyday elegance.'
        }
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
