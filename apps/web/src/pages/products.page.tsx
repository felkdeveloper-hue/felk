import { Seo } from '@/components/common/seo';
import { CatalogListShell } from '@/components/catalog';
import { buildAbsoluteUrl, siteConfig } from '@/config';
import { useCatalogSearchParams, useProductsList } from '@/hooks/catalog';

export function ProductsPage() {
  const { state, setSearch, clearFilters } = useCatalogSearchParams();
  const query = useProductsList(state);

  return (
    <>
      <Seo
        title="Shop"
        description={`Browse the full ${siteConfig.name} collection.`}
        url={buildAbsoluteUrl('/products')}
      />
      <CatalogListShell
        eyebrow="Catalog"
        title="All products"
        description="Discover considered pieces designed for everyday elegance."
        state={state}
        products={query.data?.data ?? []}
        total={query.data?.meta.total}
        totalPages={query.data?.meta.totalPages}
        isLoading={query.isLoading}
        isError={query.isError}
        onRetry={() => void query.refetch()}
        onSearchChange={setSearch}
        onClearFilters={clearFilters}
      />
    </>
  );
}
