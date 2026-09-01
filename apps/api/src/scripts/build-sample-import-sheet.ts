/**
 * Builds a ready-to-upload sample Excel sheet for testing bulk product import.
 * Uses the owner's live categories and public Unsplash images so products appear
 * with photos + multiple colour/size variants after import.
 *
 *   pnpm --filter @fe-platform/api exec tsx src/scripts/build-sample-import-sheet.ts
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ExcelJS from 'exceljs';
import { connectDatabase, disconnectDatabase } from '@/config/index.js';
import { CategoryModel } from '@/models/master-data.models.js';
import { OFFICIAL_BRAND_NAME } from '@/constants/product.js';
import { IMPORT_COLUMNS } from '@/services/product-import.service.js';

const OUT =
  process.env.SAMPLE_IMPORT_OUT ??
  join(dirname(fileURLToPath(import.meta.url)), '../../../../sample-bulk-products.xlsx');

type SampleRow = Record<string, string | number>;

async function pickCategory(candidates: string[]): Promise<string> {
  for (const name of candidates) {
    const exact = await CategoryModel.findOne({
      isDeleted: false,
      status: 'active',
      name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
    })
      .select('name')
      .lean();
    if (exact?.name) return String(exact.name);
  }

  for (const name of candidates) {
    const fuzzy = await CategoryModel.findOne({
      isDeleted: false,
      status: 'active',
      $or: [
        { name: new RegExp(name, 'i') },
        { slug: new RegExp(name.toLowerCase().replace(/\s+/g, '-'), 'i') },
      ],
    })
      .select('name')
      .lean();
    if (fuzzy?.name) return String(fuzzy.name);
  }

  const fallback = await CategoryModel.findOne({ isDeleted: false, status: 'active' })
    .select('name')
    .lean();
  return String(fallback?.name ?? 'Crop tops');
}

async function main() {
  await connectDatabase();

  const dressCategory = await pickCategory([
    'Casual Dresses',
    'Party Dress',
    'Mini Dresses',
    'All dresses',
    'Dresses',
  ]);
  const topCategory = await pickCategory(['Crop tops', 'Basic Tops', 'All Tops', 'Tops']);
  const jeanCategory = await pickCategory(['Jeans - Denim', 'Jeans', 'All Bottoms', 'Bottoms']);

  console.log({ dressCategory, topCategory, jeanCategory });

  // Stable, publicly reachable Unsplash CDN URLs (clothing photos).
  const pinkDress = 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=900&q=80';
  const pinkDress2 = 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=900&q=80';
  const blackDress = 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=900&q=80';
  const oliveTop = 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=900&q=80';
  const pinkTop = 'https://images.unsplash.com/photo-1564257631407-4deb1f99d992?w=900&q=80';
  const blueJean = 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=900&q=80';
  const blackJean = 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=900&q=80';

  const stamp = new Date().toISOString().slice(0, 10);
  const rows: SampleRow[] = [
    // Product 1 — midi dress, 2 colours × 2 sizes = 4 variants + images
    {
      name: `Sample Floral Midi Dress (${stamp})`,
      stockControlNumber: 'SC-SAMPLE-001',
      category: dressCategory,
      color: 'Hot Pink',
      size: 'S',
      price: 8999,
      salePrice: 7499,
      stock: 8,
      gender: 'women',
      material: 'Cotton',
      occasions: 'Party, Casual',
      tags: 'sample, bulk-test',
      status: 'active',
      brand: OFFICIAL_BRAND_NAME,
      shortDescription: 'Soft floral midi dress — bulk upload sample',
      description:
        'Created by the sample bulk upload sheet so you can verify images, variants and stock.',
      specifications: 'Fit: Regular | Length: Midi | Fabric care: Hand Wash | Closure: Zip',
      seoTitle: `Sample Floral Midi Dress (${stamp}) | FE`,
      seoDescription: 'Floral midi dress available in Hot Pink and Black, sizes S and M.',
      paymentOption: 'both',
      returnsAvailable: 'yes',
      returnsCriteria: 'No refunds. Exchanges available; customer covers exchange shipping costs.',
      warrantyAvailable: 'no',
      images: `${pinkDress}, ${pinkDress2}`,
    },
    {
      name: `Sample Floral Midi Dress (${stamp})`,
      category: dressCategory,
      color: 'Hot Pink',
      size: 'M',
      price: 8999,
      salePrice: 7499,
      stock: 5,
      images: pinkDress,
    },
    {
      name: `Sample Floral Midi Dress (${stamp})`,
      category: dressCategory,
      color: 'Black',
      size: 'S',
      price: 8999,
      stock: 6,
      images: blackDress,
    },
    {
      name: `Sample Floral Midi Dress (${stamp})`,
      category: dressCategory,
      color: 'Black',
      size: 'M',
      price: 8999,
      stock: 4,
      images: blackDress,
    },

    // Product 2 — crop top, 2 colours × 2 sizes
    {
      name: `Sample Ruffle Crop Top (${stamp})`,
      category: topCategory,
      color: 'Olive',
      size: 'S',
      price: 3999,
      salePrice: 3499,
      stock: 10,
      gender: 'women',
      material: 'Cotton',
      occasions: 'Casual',
      tags: 'sample, bulk-test',
      status: 'active',
      brand: OFFICIAL_BRAND_NAME,
      shortDescription: 'Everyday ruffle crop top — bulk upload sample',
      description: 'Second sample product with two colours and two sizes.',
      specifications:
        'Fit: Slim Fit | Neckline: Round Neck | Sleeve length: Short Sleeves | Fabric care: Machine Wash',
      seoTitle: `Sample Ruffle Crop Top (${stamp}) | FE`,
      seoDescription: 'Ruffle crop top in Olive and Hot Pink.',
      paymentOption: 'cod',
      returnsAvailable: 'yes',
      returnsCriteria: 'Exchange within 5 days',
      warrantyAvailable: 'no',
      images: oliveTop,
    },
    {
      name: `Sample Ruffle Crop Top (${stamp})`,
      category: topCategory,
      color: 'Olive',
      size: 'M',
      price: 3999,
      salePrice: 3499,
      stock: 7,
      images: oliveTop,
    },
    {
      name: `Sample Ruffle Crop Top (${stamp})`,
      category: topCategory,
      color: 'Hot Pink',
      size: 'S',
      price: 3999,
      stock: 9,
      images: pinkTop,
    },
    {
      name: `Sample Ruffle Crop Top (${stamp})`,
      category: topCategory,
      color: 'Hot Pink',
      size: 'M',
      price: 3999,
      stock: 3,
      images: pinkTop,
    },

    // Product 3 — jeans, 2 colours × 2 sizes
    {
      name: `Sample High-Rise Denim (${stamp})`,
      category: jeanCategory,
      color: 'Blue',
      size: 'S',
      price: 6999,
      stock: 12,
      gender: 'women',
      material: 'Denim',
      occasions: 'Casual',
      tags: 'sample, bulk-test',
      status: 'active',
      brand: OFFICIAL_BRAND_NAME,
      shortDescription: 'Classic high-rise denim — bulk upload sample',
      description: 'Third sample product so you can see jeans with multiple sizes.',
      specifications:
        'Fit: Slim Fit | Rise: High Rise | Closure: Button | Fabric care: Machine Wash',
      seoTitle: `Sample High-Rise Denim (${stamp}) | FE`,
      seoDescription: 'High-rise jeans in Blue and Black.',
      paymentOption: 'prepaid',
      returnsAvailable: 'yes',
      returnsCriteria: '14-day return on denim with original tags',
      warrantyAvailable: 'yes',
      warrantyDetails: '6-month stitching warranty',
      images: blueJean,
    },
    {
      name: `Sample High-Rise Denim (${stamp})`,
      category: jeanCategory,
      color: 'Blue',
      size: 'M',
      price: 6999,
      stock: 8,
      images: blueJean,
    },
    {
      name: `Sample High-Rise Denim (${stamp})`,
      category: jeanCategory,
      color: 'Black',
      size: 'S',
      price: 7299,
      stock: 6,
      images: blackJean,
    },
    {
      name: `Sample High-Rise Denim (${stamp})`,
      category: jeanCategory,
      color: 'Black',
      size: 'M',
      price: 7299,
      stock: 5,
      images: blackJean,
    },
  ];

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'FE Admin';
  workbook.created = new Date();

  const guide = workbook.addWorksheet('How to use');
  guide.columns = [
    { header: 'Step', key: 'step', width: 10 },
    { header: 'Instruction', key: 'text', width: 90 },
  ];
  guide.getRow(1).font = { bold: true };
  guide.addRow({
    step: '1',
    text: 'This file already has 3 sample products with colours, sizes, stock and image links.',
  });
  guide.addRow({
    step: '2',
    text: 'In Admin → Products click "Bulk upload products", choose this file, review the preview, then Import.',
  });
  guide.addRow({
    step: '3',
    text: 'After import, open each product — you should see photos, multiple colour/size variants, and stock numbers.',
  });
  guide.addRow({
    step: 'Tip',
    text: 'Rows that share the same Product Name become ONE product. Do not rename those rows differently.',
  });

  const sheet = workbook.addWorksheet('Products');
  sheet.columns = IMPORT_COLUMNS.map((column) => ({
    header: column.label,
    key: column.key,
    width: Math.max(14, Math.min(40, column.label.length + 12)),
  }));
  const header = sheet.getRow(1);
  header.font = { bold: true };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F1F1' } };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  for (const row of rows) sheet.addRow(row);

  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, buffer);
  console.log(`Wrote ${OUT} (${buffer.length} bytes, ${rows.length} rows, 3 products)`);

  await disconnectDatabase();
}

main().catch(async (error) => {
  console.error(error);
  await disconnectDatabase().catch(() => undefined);
  process.exit(1);
});
