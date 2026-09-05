import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/query-keys';
import type { MegaMenuGender } from '@/constants/mega-menu-defaults';
import { navigationMenusApi } from '@/services/sdk/navigation-menus';

const MENU_STALE = 1000 * 60 * 5;

/** Women/Men mega menu + homepage Categories tiles from CMS (bundled fallback). */
export function useNavigationMenu(key: MegaMenuGender = 'women') {
  return useQuery({
    queryKey: QUERY_KEYS.storefront.navigationMenu(key),
    queryFn: () => navigationMenusApi.getByKey(key),
    staleTime: MENU_STALE,
  });
}
