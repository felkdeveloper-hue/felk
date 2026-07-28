import { ProductModel, ProductVariantModel } from '@/models/product.models';
import { ApiError } from '@/utils/errors/api-error';
import { generateParentSku, nextLinkedSku, nextSkuAfter } from '@/utils/sku.helper';

/**
 * SKU uniqueness must include soft-deleted rows — Mongo unique indexes on sku
 * still apply to them, so allocation that ignores deleted docs causes E11000 → 500.
 */
export async function isSkuTaken(
  sku: string,
  options?: {
    excludeProductId?: string;
    excludeVariantId?: string;
    /** Default true: match unique indexes that cover soft-deleted rows. */
    includeDeleted?: boolean;
  },
): Promise<boolean> {
  const upper = sku.toUpperCase();
  const includeDeleted = options?.includeDeleted !== false;
  const productFilter: Record<string, unknown> = {
    sku: upper,
    ...(options?.excludeProductId ? { _id: { $ne: options.excludeProductId } } : {}),
  };
  const variantFilter: Record<string, unknown> = {
    sku: upper,
    ...(options?.excludeVariantId ? { _id: { $ne: options.excludeVariantId } } : {}),
  };
  if (!includeDeleted) {
    productFilter.isDeleted = false;
    variantFilter.isDeleted = false;
  }

  const [productHit, variantHit] = await Promise.all([
    ProductModel.findOne(productFilter).select('_id'),
    ProductVariantModel.findOne(variantFilter).select('_id'),
  ]);
  return Boolean(productHit || variantHit);
}

export async function allocateUniqueParentSku(): Promise<string> {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const candidate = generateParentSku();
    if (!(await isSkuTaken(candidate))) return candidate;
  }

  const fallback = `${generateParentSku()}${Date.now().toString().slice(-3)}`;
  if (await isSkuTaken(fallback)) {
    throw ApiError.conflict('Unable to allocate a unique SKU', undefined, 'SKU_ALLOCATION_FAILED');
  }
  return fallback;
}

export async function allocateUniqueLinkedSku(
  parentSku: string,
  usedSkus: string[],
): Promise<string> {
  let candidate = nextLinkedSku(parentSku, usedSkus);
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (!(await isSkuTaken(candidate))) return candidate;
    candidate = nextSkuAfter(candidate);
  }
  throw ApiError.conflict(
    'Unable to allocate a unique variant SKU',
    undefined,
    'SKU_ALLOCATION_FAILED',
  );
}
