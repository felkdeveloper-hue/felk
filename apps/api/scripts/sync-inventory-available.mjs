/**
 * Recompute inventory `available` from onHand/reserved/damaged buckets.
 * Fixes rows created by seed scripts that only set onHand.
 *
 * Usage:
 *   node apps/api/scripts/sync-inventory-available.mjs
 */
import mongoose from 'mongoose';

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/fe-platform';

function computeAvailable(onHand, reserved, damaged) {
  return Math.max(0, onHand - reserved - damaged);
}

function deriveStockStatus(available, reorderPoint, safetyStock) {
  if (available <= 0) return 'out_of_stock';
  const threshold = Math.max(reorderPoint, safetyStock);
  if (threshold > 0 && available <= threshold) return 'low_stock';
  return 'in_stock';
}

await mongoose.connect(uri);
const col = mongoose.connection.db.collection('inventory_items');
const items = await col.find({ isDeleted: { $ne: true } }).toArray();

let updated = 0;
for (const item of items) {
  const onHand = Number(item.onHand ?? 0);
  const reserved = Number(item.reserved ?? 0);
  const damaged = Number(item.damaged ?? 0);
  const reorderPoint = Number(item.reorderPoint ?? 0);
  const safetyStock = Number(item.safetyStock ?? 0);
  const available = computeAvailable(onHand, reserved, damaged);
  const stockStatus = deriveStockStatus(available, reorderPoint, safetyStock);

  if (item.available !== available || item.stockStatus !== stockStatus) {
    await col.updateOne({ _id: item._id }, { $set: { available, stockStatus } });
    updated += 1;
  }
}

console.log(`Synced ${updated} of ${items.length} inventory rows`);
await mongoose.disconnect();
