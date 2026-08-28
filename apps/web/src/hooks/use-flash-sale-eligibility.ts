import { useMemo } from 'react';
import { useCategoriesList } from '@/hooks/catalog/use-categories';
import type { Product } from '@/services/sdk/products';
import type { FlashSaleCategoryRef } from '@/utils/flash-sale-eligibility';
import {
  buildCategorySlugLookup,
  isFlashSaleEligibleForCategories,
  isProductFlashSaleEligible,
} from '@/utils/flash-sale-eligibility';

export function useCategorySlugLookup() {
  const categoriesQuery = useCategoriesList();
  return useMemo(
    () => buildCategorySlugLookup(categoriesQuery.data?.data ?? []),
    [categoriesQuery.data?.data],
  );
}

export function useFlashSaleEligibility(product?: Product | null) {
  const slugByCategoryId = useCategorySlugLookup();
  const eligible = useMemo(() => {
    if (!product) return true;
    return isProductFlashSaleEligible(product, slugByCategoryId);
  }, [product, slugByCategoryId]);

  return { eligible, slugByCategoryId };
}

export function useFlashSaleEligibilityForCategories(ref?: FlashSaleCategoryRef | null) {
  const slugByCategoryId = useCategorySlugLookup();
  const eligible = useMemo(() => {
    if (!ref) return true;
    return isFlashSaleEligibleForCategories(ref, slugByCategoryId);
  }, [ref, slugByCategoryId]);

  return { eligible, slugByCategoryId };
}
