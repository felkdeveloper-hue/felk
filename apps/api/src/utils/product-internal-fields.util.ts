/** Admin-only product fields that must never appear on public storefront responses. */
const INTERNAL_PRODUCT_FIELDS = ['stockControlNumber'] as const;

export function stripInternalProductFields<T extends Record<string, unknown>>(product: T): T {
  const copy = { ...product };
  for (const key of INTERNAL_PRODUCT_FIELDS) {
    delete copy[key];
  }
  return copy;
}

export function stripInternalProductFieldsList<T extends Record<string, unknown>>(
  products: T[],
): T[] {
  return products.map(stripInternalProductFields);
}
