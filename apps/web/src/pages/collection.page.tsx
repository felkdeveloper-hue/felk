import { useCallback, useMemo } from 'react';
import { Seo } from '@/components/common/seo';
import { CatalogCategoryHero, CatalogListShell } from '@/components/catalog';
import { buildAbsoluteUrl } from '@/config';
import { useCatalogSearchParams, useInfiniteProducts } from '@/hooks/catalog';
import type { CatalogSearchState } from '@/utils/catalog';

export type CollectionFlag = 'isBestSeller' | 'isNewArrival';

export interface CollectionPageProps {
  title: string;
  description: string;
  scopeKey: string;
  flag: CollectionFlag;
  emptyTitle: string;
  emptyDescription: string;
}

export function CollectionPage({
  title,
  description,
  scopeKey,
  flag,
  emptyTitle,
  emptyDescription,
}: CollectionPageProps) {
  const { state, setSearch, clearFilters } = useCatalogSearchParams();
  const mergedState = useMemo(
    (): CatalogSearchState => ({
      ...state,
      isBestSeller: flag === 'isBestSeller' ? true : state.isBestSeller,
      isNewArrival: flag === 'isNewArrival' ? true : state.isNewArrival,
    }),
    [flag, state],
  );
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

  return (
    <>
      <Seo
        title={title}
        description={description}
        url={buildAbsoluteUrl(flag === 'isBestSeller' ? '/best-sellers' : '/new-arrivals')}
      />

      <CatalogCategoryHero title={title} scopeKey={scopeKey} tagline={description} />

      <CatalogListShell
        state={mergedState}
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
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
      />
    </>
  );
}

export function BestSellersPage() {
  return (
    <CollectionPage
      title="Best Seller"
      description="Most wanted pieces right now."
      scopeKey="best-sellers"
      flag="isBestSeller"
      emptyTitle="No best sellers yet"
      emptyDescription="Turn on Best Seller for a product in the admin panel to show it here."
    />
  );
}

export function NewArrivalsPage() {
  return (
    <CollectionPage
      title="New Arrivals"
      description="Fresh drops. Just landed."
      scopeKey="new-arrivals"
      flag="isNewArrival"
      emptyTitle="No new arrivals yet"
      emptyDescription="Turn on New Arrival for a product in the admin panel to show it here."
    />
  );
}
