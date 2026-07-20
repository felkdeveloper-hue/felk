import { CmsResourceListPage } from '@/components/admin';
import { cmsApi } from '@/services';

export function CategoriesPage() {
  return (
    <CmsResourceListPage
      title="Categories"
      description="Organize catalog hierarchy with SEO-friendly category trees."
      resourceKey="categories"
      api={cmsApi.categories}
      canCreate
      canDelete
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

export function CmsPagesPage() {
  return (
    <CmsResourceListPage
      title="CMS Pages"
      description="Create and publish static storefront pages."
      resourceKey="pages"
      api={cmsApi.pages}
      canCreate
      canDelete
    />
  );
}

export function CmsBannersPage() {
  return (
    <CmsResourceListPage
      title="Banners"
      description="Hero and marketing banners for the storefront."
      resourceKey="hero-banners"
      api={cmsApi.heroBanners}
      canCreate
      canDelete
    />
  );
}

export function CmsHomePage() {
  return (
    <CmsResourceListPage
      title="Home sections"
      description="Configure home page sections and featured modules."
      resourceKey="home-sections"
      api={cmsApi.homeSections}
      canCreate
      canDelete
    />
  );
}

export function CmsFaqsPage() {
  return (
    <CmsResourceListPage
      title="FAQs"
      description="Help center questions shown on the storefront."
      resourceKey="faqs"
      api={cmsApi.faqs}
      canCreate
      canDelete
    />
  );
}

export function MarketingPromosPage() {
  return (
    <CmsResourceListPage
      title="Promo banners"
      description="Marketing promo placements for homepage and campaign pages."
      resourceKey="promo-banners"
      api={cmsApi.promoBanners}
      canCreate
      canDelete
    />
  );
}
