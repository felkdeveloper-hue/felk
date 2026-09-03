import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Seo } from '@/components/common/seo';
import { CatalogCategoryHero, CatalogListShell } from '@/components/catalog';
import { buildAbsoluteUrl, siteConfig } from '@/config';
import type { MegaMenuGender } from '@/constants/mega-menu-defaults';
import { getHomeCategoryNavItem, isHomeCategoryNavSlug } from '@/constants/home-category-nav';
import { useCatalogSearchParams, useCategoriesList, useInfiniteProducts } from '@/hooks/catalog';
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
  const categoriesQuery = useCategoriesList();

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
  const menuKey = meta?.scopeKey ?? 'women';

  const menuQuery = useQuery({
    queryKey: ['storefront', 'navigation-menus', menuKey, 'hero'],
    queryFn: () => navigationMenusApi.getByKey(menuKey),
    staleTime: 1000 * 60 * 10,
  });

  const filteredCategory = useMemo(() => {
    if (!state.categoryId) return undefined;
    return categoriesQuery.data?.data.find((item) => item.id === state.categoryId);
  }, [categoriesQuery.data?.data, state.categoryId]);

  const filteredSlug = filteredCategory?.slug;
  const isSidebarCategory = isHomeCategoryNavSlug(filteredSlug);
  const sidebarNavItem = getHomeCategoryNavItem(filteredSlug);
  const defaultShopBannerUrl = menuQuery.data?.heroBannerUrl?.trim() || undefined;

  // Banner rules:
  // - No category filter → shop/gender default banner + Women/All Products title
  // - One of the 8 sidebar categories → that category’s banner + its name
  // - Any other category filter → default shop banner + bold category name (e.g. Midi Dresses)
  const heroTitle = filteredCategory?.name ?? meta?.title ?? 'All Products';
  const heroScopeKey = isSidebarCategory ? (filteredSlug ?? 'women') : (meta?.scopeKey ?? 'women');
  const heroBannerUrl = isSidebarCategory
    ? filteredCategory?.imageUrl?.trim() || sidebarNavItem?.imageUrl || defaultShopBannerUrl
    : defaultShopBannerUrl;

  return (
    <>
      <Seo
        title={filteredCategory?.name ?? meta?.title ?? 'Shop'}
        description={meta?.description ?? `Browse the full ${siteConfig.name} collection.`}
        url={buildAbsoluteUrl('/products')}
      />

      <CatalogCategoryHero
        title={heroTitle}
        scopeKey={heroScopeKey}
        imageUrl={heroBannerUrl}
        tagline={isSidebarCategory ? (filteredCategory?.description ?? '') : ''}
      />

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
