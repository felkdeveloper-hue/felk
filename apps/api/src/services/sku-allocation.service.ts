import { ProductModel, ProductVariantModel } from '@/models/product.models';
import { ApiError } from '@/utils/errors/api-error';
import { generateParentSku, nextLinkedSku, nextSkuAfter } from '@/utils/sku.helper';

export async function isSkuTaken(
  sku: string,
  options?: { excludeProductId?: string; excludeVariantId?: string },
): Promise<boolean> {
  const upper = sku.toUpperCase();
  const [productHit, variantHit] = await Promise.all([
    ProductModel.findOne({
      sku: upper,
      isDeleted: false,
      ...(options?.excludeProductId ? { _id: { $ne: options.excludeProductId } } : {}),
    }).select('_id'),
    ProductVariantModel.findOne({
      sku: upper,
      isDeleted: false,
      ...(options?.excludeVariantId ? { _id: { $ne: options.excludeVariantId } } : {}),
    }).select('_id'),
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
