import mongoose from 'mongoose';

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/fe-platform';

await mongoose.connect(uri);
const col = mongoose.connection.db.collection('product_variants');
const indexes = await col.indexes();
console.log('indexes before:', JSON.stringify(indexes, null, 2));

const nullCount = await col.countDocuments({ barcode: null });
console.log('null barcode docs:', nullCount);

for (const idx of indexes) {
  if (idx.name && idx.name !== '_id_' && idx.key && idx.key.barcode === 1) {
    console.log('dropping', idx.name);
    await col.dropIndex(idx.name);
  }
}

const unset = await col.updateMany(
  { $or: [{ barcode: null }, { barcode: '' }] },
  { $unset: { barcode: '' } },
);
console.log('unset modified:', unset.modifiedCount);

await col.createIndex(
  { barcode: 1 },
  {
    unique: true,
    partialFilterExpression: { barcode: { $type: 'string' } },
    name: 'barcode_1',
  },
);
console.log('recreated partial barcode_1');
console.log('indexes after:', JSON.stringify(await col.indexes(), null, 2));
await mongoose.disconnect();
