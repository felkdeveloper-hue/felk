/**
 * FE Platform catalog SKUs.
 * Parent: FE + year + 4 random digits (e.g. FE20261234)
 * Variants: sequential from parent (FE20261235, FE20261236, …)
 */

const SKU_PREFIX = 'FE';

export function generateParentSku(year = new Date().getFullYear()): string {
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${SKU_PREFIX}${year}${rand}`;
}

export function parseSkuNumeric(sku: string): bigint | null {
  const match = sku
    .trim()
    .toUpperCase()
    .match(/^FE(\d+)$/);
  if (!match?.[1]) return null;
  return BigInt(match[1]);
}

export function formatSkuFromNumeric(value: bigint): string {
  return `${SKU_PREFIX}${value.toString()}`;
}

export function nextSkuAfter(sku: string): string {
  const numeric = parseSkuNumeric(sku);
  if (numeric == null) {
    throw new Error(`Invalid FE SKU: ${sku}`);
  }
  return formatSkuFromNumeric(numeric + 1n);
}

/** Next free linked SKU after the parent and any already-used sibling SKUs. */
export function nextLinkedSku(parentSku: string, usedSkus: string[]): string {
  let max = parseSkuNumeric(parentSku) ?? 0n;
  for (const used of usedSkus) {
    const numeric = parseSkuNumeric(used);
    if (numeric != null && numeric > max) max = numeric;
  }
  return formatSkuFromNumeric(max + 1n);
}
