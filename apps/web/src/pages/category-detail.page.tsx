import { useCallback, useMemo } from 'react';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { Seo } from '@/components/common/seo';
import { CatalogCategoryHero, CatalogListShell } from '@/components/catalog';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/layout/container';
import { buildAbsoluteUrl, siteConfig } from '@/config';
import { ROUTES } from '@/constants';
import {
  useCatalogSearchParams,
  useCategoriesList,
  useCategoryBySlug,
  useInfiniteProducts,
} from '@/hooks/catalog';
import { catalogSearchToUrlParams, type CatalogSearchState } from '@/utils/catalog';

export function CategoryDetailPage() {
  const navigate = useNavigate();
  const { slug } = useParams({ strict: false }) as { slug: string };
  const categoryQuery = useCategoryBySlug(slug);
  const category = categoryQuery.data;
  const categoriesQuery = useCategoriesList();

  const { state, setSearch, clearFilters } = useCatalogSearchParams();
  // Only filter once the slug resolves — never reuse a stale categoryId from URL/search.
  const mergedState = useMemo(
    () => ({ ...state, categoryId: category?.id }),
    [state, category?.id],
  );
  const categoryReady = Boolean(category?.id);
  const categoryMissing = categoryQuery.isFetched && !category?.id && !categoryQuery.isError;

  const query = useInfiniteProducts(mergedState, {
    enabled: categoryReady,
  });

  const products = useMemo(
    () => (categoryReady ? (query.data?.pages.flatMap((page) => page.data) ?? []) : []),
    [categoryReady, query.data?.pages],
  );

  const total = categoryReady ? query.data?.pages[0]?.meta.total : 0;
  const hasNextPage = Boolean(query.hasNextPage);

  const onLoadMore = useCallback(() => {
    if (!query.hasNextPage || query.isFetchingNextPage) return;
    void query.fetchNextPage();
  }, [query]);

  const onSearchChange = useCallback(
    (patch: Partial<CatalogSearchState>) => {
      // Switching category while on /categories/$slug must change the route —
      // otherwise this page keeps forcing the old categoryId.
      if ('categoryId' in patch && patch.categoryId !== category?.id) {
        const nextState: CatalogSearchState = {
          ...state,
          ...patch,
          page: 1,
        };

        if (!patch.categoryId) {
          const { categoryId: _removed, ...rest } = nextState;
          void navigate({
            to: ROUTES.products,
            search: catalogSearchToUrlParams(rest) as never,
          });
          return;
        }

        const nextCategory = categoriesQuery.data?.data.find(
          (item) => item.id === patch.categoryId,
        );
        if (nextCategory?.slug) {
          const { categoryId: _removed, ...rest } = nextState;
          void navigate({
            to: '/categories/$slug',
            params: { slug: nextCategory.slug },
            search: catalogSearchToUrlParams(rest) as never,
          });
          return;
        }

        void navigate({
          to: ROUTES.products,
          search: catalogSearchToUrlParams(nextState) as never,
        });
        return;
      }

      setSearch(patch);
    },
    [categoriesQuery.data?.data, category?.id, navigate, setSearch, state],
  );

  const onClearFilters = useCallback(() => {
    // Keep the current category route; clear only other facets.
    clearFilters();
  }, [clearFilters]);

  const heroTitle = category?.name ?? slug.replace(/-/g, ' ');
  const prettyName = category?.name ?? slug.replace(/-/g, ' ');

  if (categoryMissing) {
    return (
      <>
        <Seo
          title="Category unavailable"
          description={`This category is not available at ${siteConfig.name}.`}
          url={buildAbsoluteUrl(`/categories/${slug}`)}
          noIndex
        />
        <CatalogCategoryHero title={prettyName} scopeKey={slug} />
        <Container className="py-10">
          <EmptyState
            title={`Nothing here in ${prettyName}`}
            description="This section isn’t available yet. Browse the full collection or try another category from the menu."
            action={
              <Button asChild variant="outline">
                <Link to={ROUTES.products}>Browse all products</Link>
              </Button>
            }
          />
        </Container>
      </>
    );
  }

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
        isLoading={
          categoryQuery.isPending || (categoryReady && (query.isPending || query.isLoading))
        }
        isError={query.isError}
        isFetchingNextPage={query.isFetchingNextPage}
        hasNextPage={hasNextPage}
        onLoadMore={onLoadMore}
        onRetry={() => void query.refetch()}
        onSearchChange={onSearchChange}
        onClearFilters={onClearFilters}
        facetKeys={category?.filterFacetKeys}
        emptyTitle={`No products in ${prettyName} yet`}
        emptyDescription="We’re still adding pieces to this edit. Explore other categories or check back soon."
        emptyAction={
          <Button asChild variant="outline">
            <Link to={ROUTES.products}>Continue shopping</Link>
          </Button>
        }
      />
    </>
  );
}
