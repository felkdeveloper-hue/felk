import { INVENTORY_STATUS } from '@/constants/inventory-status';

export interface StockBuckets {
  onHand: number;
  available: number;
  reserved: number;
  incoming: number;
  damaged: number;
  returned: number;
}

export function deriveStockStatus(
  available: number,
  reorderPoint: number,
  safetyStock: number,
): string {
  if (available <= 0) return INVENTORY_STATUS.OUT_OF_STOCK;
  const threshold = Math.max(reorderPoint, safetyStock);
  if (threshold > 0 && available <= threshold) return INVENTORY_STATUS.LOW_STOCK;
  return INVENTORY_STATUS.IN_STOCK;
}

export function assertNonNegative(buckets: StockBuckets, context: string): void {
  for (const [key, value] of Object.entries(buckets)) {
    if (value < 0) {
      throw Object.assign(new Error(`Stock cannot become negative (${key})`), {
        code: 'NEGATIVE_STOCK',
        context,
        buckets,
      });
    }
  }
}

/** Recalculate available from physical buckets. */
export function computeAvailable(onHand: number, reserved: number, damaged: number): number {
  return Math.max(0, onHand - reserved - damaged);
}

export function snapshotBalance(item: {
  onHand: number;
  available: number;
  reserved: number;
  incoming: number;
  damaged: number;
  returned: number;
}): StockBuckets {
  return {
    onHand: item.onHand,
    available: item.available,
    reserved: item.reserved,
    incoming: item.incoming,
    damaged: item.damaged,
    returned: item.returned,
  };
}
