import { CmsResourceListPage } from '@/components/admin';
import { ADMIN_ROUTES } from '@/constants';
import { cmsApi } from '@/services/sdk/admin';

export function CategoriesPage() {
  return (
    <CmsResourceListPage
      title="Categories"
      description="Organize catalog hierarchy with SEO-friendly category trees."
      resourceKey="categories"
      api={cmsApi.categories}
      canCreate
      canDelete
      detailPath={ADMIN_ROUTES.categoryDetail}
      showImage
    />
  );
}

export function CollectionsPage() {
  return (
    <CmsResourceListPage
      title="Collections"
      description="Curated product groups for campaigns and navigation."
      resourceKey="collections"
      api={cmsApi.collections}
      canCreate
      canDelete
    />
  );
}

export function BrandsPage() {
  return (
    <CmsResourceListPage
      title="Brands"
      description="Manage brand profiles and linked products."
      resourceKey="brands"
      api={cmsApi.brands}
      canCreate
      canDelete
    />
  );
}

export function SizesPage() {
  return (
    <CmsResourceListPage
      title="Sizes"
      description="Create size options customers can filter by in the shop."
      resourceKey="sizes"
      api={cmsApi.sizes}
      canCreate
      canDelete
    />
  );
}

export function OccasionsPage() {
  return (
    <CmsResourceListPage
      title="Occasions"
      description="Create occasion tags used in shop filters and product assignments."
      resourceKey="occasions"
      api={cmsApi.occasions}
      canCreate
      canDelete
    />
  );
}
