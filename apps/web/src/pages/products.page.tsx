import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { Seo } from '@/components/common/seo';
import { CatalogCategoryHero, CatalogListShell } from '@/components/catalog';
import { buildAbsoluteUrl, siteConfig } from '@/config';
import type { MegaMenuGender } from '@/constants/mega-menu-defaults';
import { useCatalogSearchParams, useInfiniteProducts } from '@/hooks/catalog';
import { navigationMenusApi } from '@/services/sdk/navigation-menus';

const GENDER_META: Record<
  string,
  { title: string; description: string; scopeKey: MegaMenuGender }
> = {
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
  const menuKey = meta?.scopeKey;

  const menuQuery = useQuery({
    queryKey: ['storefront', 'navigation-menus', menuKey, 'hero'],
    queryFn: () => navigationMenusApi.getByKey(menuKey!),
    enabled: Boolean(menuKey),
    staleTime: 1000 * 60 * 10,
  });

  const heroTitle = meta?.title ?? 'All Products';
  const heroScopeKey = meta?.scopeKey ?? 'women';
  const heroBannerUrl = menuQuery.data?.heroBannerUrl?.trim() || undefined;

  return (
    <>
      <Seo
        title={meta?.title ?? 'Shop'}
        description={meta?.description ?? `Browse the full ${siteConfig.name} collection.`}
        url={buildAbsoluteUrl('/products')}
      />

      <CatalogCategoryHero title={heroTitle} scopeKey={heroScopeKey} imageUrl={heroBannerUrl} />

      <CatalogListShell
        state={state}
        products={products}
        total={total}
        isLoading={query.isLoading}
        isError={query.isError}
        isFetching={query.isFetching}
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
