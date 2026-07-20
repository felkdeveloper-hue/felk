/**
 * Generates the next available variant SKU linked to a base product SKU.
 * Appends or increments a numeric suffix.
 */
export function nextLinkedSku(baseSku: string, existingSkus: string[]): string {
  const prefix = baseSku.replace(/-\d+$/, '');
  const usedSuffixes = existingSkus
    .map((sku) => {
      const match = sku.match(/^(.+)-(\d+)$/);
      if (match && match[1] === prefix && match[2]) return parseInt(match[2], 10);
      return null;
    })
    .filter((n): n is number => n !== null);

  const next = usedSuffixes.length > 0 ? Math.max(...usedSuffixes) + 1 : 1;
  return `${prefix}-${String(next).padStart(2, '0')}`;
}
