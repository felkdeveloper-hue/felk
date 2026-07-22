import { useNavigate, useSearch } from '@tanstack/react-router';
import { AdminPageHeader, CmsResourceListPage, PageMotion } from '@/components/admin';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ADMIN_ROUTES } from '@/constants';
import { cmsApi } from '@/services/sdk/admin';

const FILTER_TABS = [
  {
    id: 'categories',
    label: 'Categories',
    title: 'Categories',
    description: 'Organize catalog hierarchy with SEO-friendly category trees.',
    resourceKey: 'categories',
    api: cmsApi.categories,
    canCreate: true,
    canDelete: true,
    detailPath: ADMIN_ROUTES.categoryDetail,
    showImage: true,
  },
  {
    id: 'brands',
    label: 'Brands',
    title: 'Brands',
    description: 'Manage brand profiles and linked products.',
    resourceKey: 'brands',
    api: cmsApi.brands,
    canCreate: true,
    canDelete: true,
  },
  {
    id: 'colors',
    label: 'Colors',
    title: 'Colors',
    description: 'Color options for product variants (Black, Navy, Olive, etc.).',
    resourceKey: 'colors',
    api: cmsApi.colors,
    canCreate: true,
    canDelete: true,
  },
  {
    id: 'sizes',
    label: 'Sizes',
    title: 'Sizes',
    description: 'Create size options customers can filter by in the shop.',
    resourceKey: 'sizes',
    api: cmsApi.sizes,
    canCreate: true,
    canDelete: true,
  },
  {
    id: 'materials',
    label: 'Materials',
    title: 'Materials',
    description: 'Fabric and material options (Cotton, Linen, Denim, etc.).',
    resourceKey: 'materials',
    api: cmsApi.materials,
    canCreate: true,
    canDelete: true,
  },
  {
    id: 'occasions',
    label: 'Occasions',
    title: 'Occasions',
    description: 'Create occasion tags used in shop filters and product assignments.',
    resourceKey: 'occasions',
    api: cmsApi.occasions,
    canCreate: true,
    canDelete: true,
  },
] as const;

type FilterTabId = (typeof FILTER_TABS)[number]['id'];

function isFilterTabId(value: unknown): value is FilterTabId {
  return FILTER_TABS.some((tab) => tab.id === value);
}

export function FiltersPage() {
  const navigate = useNavigate();
  const rawSearch = useSearch({ strict: false }) as { tab?: string };
  const activeTab = isFilterTabId(rawSearch.tab) ? rawSearch.tab : 'categories';

  const onTabChange = (value: string) => {
    void navigate({
      to: ADMIN_ROUTES.filters,
      search: { tab: value },
      replace: true,
    });
  };

  return (
    <PageMotion>
      <AdminPageHeader
        title="Filters"
        description="Manage all storefront filter options — categories, brands, colors, sizes, materials, and occasions."
      />

      <Tabs value={activeTab} onValueChange={onTabChange} className="mt-2">
        <TabsList className="mb-4 flex-wrap">
          {FILTER_TABS.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {FILTER_TABS.map((tab) => (
          <TabsContent key={tab.id} value={tab.id}>
            <div className="mb-4">
              <h2 className="font-serif text-xl text-[var(--admin-ink)]">{tab.title}</h2>
              <p className="text-sm text-[var(--admin-muted)]">{tab.description}</p>
            </div>
            <CmsResourceListPage
              title={tab.title}
              description={tab.description}
              resourceKey={tab.resourceKey}
              api={tab.api}
              canCreate={tab.canCreate}
              canDelete={tab.canDelete}
              detailPath={'detailPath' in tab ? tab.detailPath : undefined}
              showImage={'showImage' in tab ? tab.showImage : undefined}
              embedded
            />
          </TabsContent>
        ))}
      </Tabs>
    </PageMotion>
  );
}
