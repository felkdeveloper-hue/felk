/**
 * Bulk product import from an Excel / CSV sheet.
 *
 * The sheet is variant-per-row: every row is one colour + size combination and
 * consecutive rows that share a product name (or handle) are folded into a
 * single product. Parsing and validation are separated from writing so the
 * admin can preview exactly what will happen before anything is created.
 */
import ExcelJS from 'exceljs';
import {
  OFFICIAL_BRAND_NAME,
  OFFICIAL_BRAND_SLUG,
  PRODUCT_IMPORT_BATCH_LIMIT,
  PRODUCT_STATUS,
  PRODUCT_VISIBILITY,
} from '@/constants/product';
import {
  BrandModel,
  CategoryModel,
  ColorModel,
  MaterialModel,
  OccasionModel,
  SizeModel,
} from '@/models/master-data.models';
import { ProductModel } from '@/models/product.models';
import type { ActorMeta } from '@/services/cms-crud.service';
import { inventoryService } from '@/services/inventory.service';
import { attachImportImages, uploadImportZipImage } from '@/services/product-import-image.service';
import {
  createImportZipSession,
  getImportZipSession,
  isSupportedImportImageFilename,
  buildSampleImagesZip,
  type ImportZipSession,
} from '@/services/product-import-zip.service';
import { productService } from '@/services/product.service';
import { productVariantService } from '@/services/product-variant.service';
import { readFile } from 'node:fs/promises';
import { ApiError } from '@/utils/errors/api-error';
import { slugify } from '@/utils/slug.helper';

/* -------------------------------------------------------------------------- */
/* Sheet contract                                                             */
/* -------------------------------------------------------------------------- */

export type ImportColumnKey =
  | 'name'
  | 'handle'
  | 'shortDescription'
  | 'description'
  | 'status'
  | 'visibility'
  | 'category'
  | 'gender'
  | 'brand'
  | 'material'
  | 'occasions'
  | 'tags'
  | 'price'
  | 'salePrice'
  | 'comparePrice'
  | 'color'
  | 'size'
  | 'stock'
  | 'sku'
  | 'ownListing'
  | 'defaultListing'
  | 'isBestSeller'
  | 'isMoreToLove'
  | 'isFeatured'
  | 'fit'
  | 'fabricCare'
  | 'specifications'
  | 'seoTitle'
  | 'seoDescription'
  | 'returns'
  | 'returnPolicy'
  | 'warranty'
  | 'warrantyDetails'
  | 'paymentMethod'
  | 'images'
  | 'displayOrder'
  | 'variantPosition'
  | 'productPosition';

interface ColumnDef {
  key: ImportColumnKey;
  label: string;
  aliases: string[];
  required: boolean;
  help: string;
  example: string;
}

export const IMPORT_COLUMNS: ColumnDef[] = [
  // ── Product identity ──────────────────────────────────────────────────────
  {
    key: 'name',
    label: 'Product Name',
    aliases: ['product', 'title', 'productname', 'productname'],
    required: true,
    help: 'Repeat the SAME name on every colour/size row that belongs to one product. That is how variants are grouped.',
    example: 'Sample Bulk Crop Top',
  },
  {
    key: 'handle',
    label: 'Handle',
    aliases: ['slug', 'producthandle', 'group', 'urlslug'],
    required: false,
    help: 'Optional URL slug / grouping key. Leave blank to derive from Product Name.',
    example: '',
  },
  {
    key: 'shortDescription',
    label: 'Short Description',
    aliases: ['shortdesc', 'summary', 'subtitle'],
    required: false,
    help: 'One-line summary shown in product listings.',
    example: 'Soft ruffle crop top',
  },
  {
    key: 'description',
    label: 'Description',
    aliases: ['longdescription', 'fulldescription', 'details', 'body'],
    required: false,
    help: 'Full product description (HTML allowed).',
    example: '',
  },
  // ── Status & visibility ───────────────────────────────────────────────────
  {
    key: 'status',
    label: 'Status',
    aliases: ['productstatus', 'publishstatus'],
    required: false,
    help: 'draft or active. Defaults to draft.',
    example: 'draft',
  },
  {
    key: 'visibility',
    label: 'Visibility',
    aliases: ['productvisibility'],
    required: false,
    help: 'public, hidden or catalog_only. Defaults to public.',
    example: 'public',
  },
  // ── Taxonomy ──────────────────────────────────────────────────────────────
  {
    key: 'category',
    label: 'Category',
    aliases: ['categoryname', 'categoryslug'],
    required: true,
    help: 'Must already exist. Use the name or slug from the Reference sheet.',
    example: 'Crop tops',
  },
  {
    key: 'gender',
    label: 'Gender',
    aliases: ['department', 'audience'],
    required: false,
    help: 'women, men, unisex or kids.',
    example: 'women',
  },
  {
    key: 'brand',
    label: 'Brand',
    aliases: ['brandname'],
    required: false,
    help: `Defaults to ${OFFICIAL_BRAND_NAME}. Leave blank unless you need a different brand.`,
    example: OFFICIAL_BRAND_NAME,
  },
  {
    key: 'material',
    label: 'Material',
    aliases: ['fabric', 'fabrictype'],
    required: false,
    help: 'Created automatically if it does not exist.',
    example: 'Cotton',
  },
  {
    key: 'occasions',
    label: 'Occasions',
    aliases: ['occasion'],
    required: false,
    help: 'Comma-separated. Created automatically if missing.',
    example: 'Party, Casual',
  },
  {
    key: 'tags',
    label: 'Tags',
    aliases: ['tag', 'keywords'],
    required: false,
    help: 'Comma-separated product tags.',
    example: 'new, summer',
  },
  // ── Prices ────────────────────────────────────────────────────────────────
  {
    key: 'price',
    label: 'Selling Price',
    aliases: ['price', 'mrp', 'regularprice', 'variantprice', 'sellingprice'],
    required: true,
    help: 'Variant selling price (numbers only).',
    example: '9999',
  },
  {
    key: 'salePrice',
    label: 'Sale Price',
    aliases: ['discountprice', 'discountedprice', 'offerprice', 'saleprice'],
    required: false,
    help: 'Optional sale price — must be ≤ Selling Price.',
    example: '7999',
  },
  {
    key: 'comparePrice',
    label: 'Compare Price',
    aliases: [
      'compareatprice',
      'compareeprice',
      'originalretailprice',
      'rrp',
      'strikethroughprice',
    ],
    required: false,
    help: 'Crossed-out "was" price shown next to the sale price.',
    example: '11999',
  },
  // ── Variant ───────────────────────────────────────────────────────────────
  {
    key: 'color',
    label: 'Color',
    aliases: ['colour', 'variantcolor', 'variantcolour', 'colorname'],
    required: false,
    help: 'Variant colour. One row per colour + size. Created automatically if missing.',
    example: 'Hot Pink',
  },
  {
    key: 'size',
    label: 'Size',
    aliases: ['variantsize', 'sizename'],
    required: false,
    help: 'Variant size. Leave blank for one-size. Created automatically if missing.',
    example: 'S',
  },
  {
    key: 'stock',
    label: 'Stock',
    aliases: ['quantity', 'qty', 'stockquantity', 'inventory', 'stockqty'],
    required: false,
    help: 'Units available for this colour + size. Defaults to 0.',
    example: '10',
  },
  {
    key: 'sku',
    label: 'Variant SKU',
    aliases: ['variantsku', 'code', 'itemcode'],
    required: false,
    help: 'Optional variant SKU. Auto-generated when blank. Must be unique.',
    example: '',
  },
  // ── Listing flags ─────────────────────────────────────────────────────────
  {
    key: 'ownListing',
    label: 'Own Listing',
    aliases: ['ownlisting', 'listingcolor', 'separatelisting', 'listseparately'],
    required: false,
    help: 'TRUE/FALSE — show this colour as its own product card on the storefront.',
    example: 'TRUE',
  },
  {
    key: 'defaultListing',
    label: 'Default Listing',
    aliases: ['defaultlisting', 'isdefault', 'defaultvariant'],
    required: false,
    help: 'TRUE/FALSE — one colour per product. Controls the primary card shown in listings.',
    example: 'TRUE',
  },
  // ── Homepage flags ────────────────────────────────────────────────────────
  {
    key: 'isBestSeller',
    label: 'Homepage Best Seller',
    aliases: ['bestseller', 'isbestseller', 'homepagebestseller', 'featuredhome'],
    required: false,
    help: 'TRUE/FALSE — appear in the Best Sellers homepage section.',
    example: 'FALSE',
  },
  {
    key: 'isMoreToLove',
    label: 'Homepage More To Love',
    aliases: ['moretolove', 'ismoretolove', 'homepagemoretolove'],
    required: false,
    help: 'TRUE/FALSE — appear in the More To Love homepage section.',
    example: 'FALSE',
  },
  {
    key: 'isFeatured',
    label: 'Homepage Featured',
    aliases: ['featured', 'isfeatured', 'homepagefeatured'],
    required: false,
    help: 'TRUE/FALSE — appear in the Featured homepage section.',
    example: 'FALSE',
  },
  // ── Specifications ────────────────────────────────────────────────────────
  {
    key: 'fit',
    label: 'Fit',
    aliases: ['fittype', 'fitdescription'],
    required: false,
    help: 'Fit type (e.g. Slim Fit, Regular, Oversized). Added as a specification row.',
    example: 'Regular',
  },
  {
    key: 'fabricCare',
    label: 'Fabric Care',
    aliases: ['fabriccare', 'washcare', 'care', 'careinstruction'],
    required: false,
    help: 'Wash/care instructions. Added as a specification row.',
    example: 'Machine Wash Cold',
  },
  {
    key: 'specifications',
    label: 'Additional Specifications',
    aliases: ['specs', 'productspecs', 'attributes', 'detailspecs', 'specifications'],
    required: false,
    help: 'Extra detail-table rows: Name: Value pairs separated by | . Example: Neckline: Round Neck | Sleeve: Full Sleeve',
    example: 'Neckline: Round Neck | Sleeve: Full Sleeve',
  },
  // ── SEO ───────────────────────────────────────────────────────────────────
  {
    key: 'seoTitle',
    label: 'SEO Title',
    aliases: ['metatitle', 'seotitle', 'pagetitle'],
    required: false,
    help: 'Browser/Google title. Defaults to product name when blank.',
    example: '',
  },
  {
    key: 'seoDescription',
    label: 'SEO Description',
    aliases: ['metadescription', 'seodescription', 'metadesc'],
    required: false,
    help: 'Meta description for search engines.',
    example: '',
  },
  // ── Returns / Warranty / Payment ─────────────────────────────────────────
  {
    key: 'returns',
    label: 'Returns',
    aliases: ['return', 'returnavailable', 'acceptsreturns', 'returnsavailable'],
    required: false,
    help: 'yes / no. Defaults to yes.',
    example: 'yes',
  },
  {
    key: 'returnPolicy',
    label: 'Return Policy',
    aliases: ['returncriteria', 'returnspolicy', 'returnnote', 'returnpolicy', 'returnscriteria'],
    required: false,
    help: 'Return policy text shown on the product page.',
    example: '7-day exchange if unused with tags',
  },
  {
    key: 'warranty',
    label: 'Warranty',
    aliases: ['haswarranty', 'warrantyavailable', 'warrantyyes'],
    required: false,
    help: 'yes / no. Defaults to no.',
    example: 'no',
  },
  {
    key: 'warrantyDetails',
    label: 'Warranty Details',
    aliases: ['warrantynote', 'warrantydetail', 'warrantydetails'],
    required: false,
    help: 'Warranty text when Warranty is yes.',
    example: '',
  },
  {
    key: 'paymentMethod',
    label: 'Payment Method',
    aliases: ['payment', 'paymentoption', 'paymentmethod', 'codprepaid'],
    required: false,
    help: 'cod, prepaid or both. Defaults to both.',
    example: 'both',
  },
  // ── Images ────────────────────────────────────────────────────────────────
  {
    key: 'images',
    label: 'Images',
    aliases: ['image', 'images', 'imageurl', 'photo', 'photos', 'imagelinks', 'imageurls'],
    required: false,
    help: 'HTTPS image links and/or ZIP filenames, comma-separated (e.g. https://cdn.example.com/a.jpg or shirt-front.jpg). Upload an images ZIP with matching filenames. Blank same-colour rows reuse earlier images.',
    example: 'shirt-front.jpg, shirt-back.jpg',
  },
  // ── Positions ─────────────────────────────────────────────────────────────
  {
    key: 'displayOrder',
    label: 'Display Order',
    aliases: ['displayorder', 'sortorder', 'order'],
    required: false,
    help: 'Numeric. Controls sort order of this variant within its colour.',
    example: '1',
  },
  {
    key: 'variantPosition',
    label: 'Variant Position',
    aliases: ['variantposition', 'variantorder'],
    required: false,
    help: 'Numeric. Overall position of this variant among all variants for this product.',
    example: '1',
  },
  {
    key: 'productPosition',
    label: 'Product Position',
    aliases: ['productposition', 'productorder', 'productrank'],
    required: false,
    help: 'Optional. Not used for sorting yet; preserved in the export for re-import.',
    example: '',
  },
];

const HEADER_LOOKUP = new Map<string, ImportColumnKey>();
for (const column of IMPORT_COLUMNS) {
  HEADER_LOOKUP.set(normalizeHeader(column.label), column.key);
  for (const alias of column.aliases) HEADER_LOOKUP.set(normalizeHeader(alias), column.key);
}

const GENDER_ALIASES: Record<string, string> = {
  women: 'women',
  woman: 'women',
  female: 'women',
  ladies: 'women',
  men: 'men',
  man: 'men',
  male: 'men',
  unisex: 'unisex',
  kids: 'kids',
  kid: 'kids',
  children: 'kids',
};

const ALLOWED_STATUSES = new Set<string>([PRODUCT_STATUS.DRAFT, PRODUCT_STATUS.ACTIVE]);
const ALLOWED_VISIBILITIES = new Set<string>(Object.values(PRODUCT_VISIBILITY));

const MAX_ROWS = 5000;

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export interface ImportIssue {
  row: number;
  column?: string;
  message: string;
}

export interface ImportVariantInput {
  row: number;
  color: string;
  size: string;
  price: number;
  salePrice: number | null;
  comparePrice: number | null;
  stock: number | null;
  sku: string;
  images: string[];
  ownListing: boolean;
  defaultListing: boolean;
  displayOrder: number;
  variantPosition: number;
}

export interface ImportProductInput {
  handle: string;
  name: string;
  slug: string;
  category: string;
  gender: string;
  brand: string;
  material: string;
  occasions: string[];
  tags: string[];
  shortDescription: string;
  description: string;
  specifications: Array<{ name: string; value: string; sortOrder: number }>;
  seoTitle: string;
  seoDescription: string;
  paymentOption: 'cod' | 'prepaid' | 'both';
  returnsAvailable: boolean;
  returnsCriteria: string;
  warrantyAvailable: boolean;
  warrantyDetails: string;
  status: string;
  visibility: string;
  isBestSeller: boolean;
  isMoreToLove: boolean;
  isFeatured: boolean;
  rows: number[];
  variants: ImportVariantInput[];
}

export interface ImportPreview {
  products: ImportProductInput[];
  issues: ImportIssue[];
  duplicates: string[];
  newValues: { categories: string[]; colors: string[]; sizes: string[]; brands: string[] };
  summary: {
    rows: number;
    products: number;
    variants: number;
    stockUnits: number;
    images: number;
    issues: number;
    duplicates: number;
  };
  /** Present when an images ZIP was uploaded — pass back on import batches. */
  imagesSessionId?: string | null;
  zipSummary?: { imageCount: number } | null;
}

export interface ImportProductResult {
  handle: string;
  name: string;
  row: number;
  status: 'created' | 'skipped' | 'failed';
  message?: string;
  productId?: string;
  variants?: number;
}

/* -------------------------------------------------------------------------- */
/* Small helpers                                                              */
/* -------------------------------------------------------------------------- */

function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Flattens the many shapes an ExcelJS cell can hold into trimmed text. */
function cellToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    const record = value as unknown as Record<string, unknown>;
    if (typeof record.text === 'string') return record.text.trim();
    if (Array.isArray(record.richText)) {
      return record.richText
        .map((part) => String((part as { text?: unknown }).text ?? ''))
        .join('')
        .trim();
    }
    if ('result' in record) return cellToString(record.result as ExcelJS.CellValue);
    if ('hyperlink' in record) return String(record.hyperlink ?? '').trim();
  }
  return String(value).trim();
}

/** Minimal RFC 4180 reader — avoids surprises with quoted commas and CRLF. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  const content = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];
    if (quoted) {
      if (char === '"') {
        if (content[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (char !== '\r') {
      field += char ?? '';
    }
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function splitList(value: string): string[] {
  return value
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseMoney(value: string): number | null {
  const cleaned = value.replace(/[^0-9.-]/g, '');
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseWholeNumber(value: string): number | null {
  const cleaned = value.replace(/[^0-9-]/g, '');
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isInteger(parsed) ? parsed : null;
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\/\S+$/i.test(value);
}

function validateImageRef(
  value: string,
  zipLookup: Map<string, string> | null,
): { ok: true } | { ok: false; message: string } {
  if (isHttpUrl(value)) return { ok: true };
  if (!isSupportedImportImageFilename(value)) {
    return {
      ok: false,
      message: `Image "${value}" has an unsupported format. Use jpg, jpeg, png, webp, avif, or a full https:// link.`,
    };
  }
  if (!zipLookup) {
    return {
      ok: false,
      message: `Image "${value}" is not a URL. Upload an images ZIP or use a full https:// link.`,
    };
  }
  if (!zipLookup.has(value.trim().toLowerCase())) {
    return {
      ok: false,
      message: `Image "${value}" not found in ZIP.`,
    };
  }
  return { ok: true };
}

async function resolveImportImageUrls(
  images: string[],
  productHandle: string,
  zipLookup: Map<string, string> | null,
  urlCache: Map<string, string>,
): Promise<string[]> {
  const resolved: string[] = [];
  for (const ref of images) {
    if (isHttpUrl(ref)) {
      resolved.push(ref);
      continue;
    }
    const key = ref.trim().toLowerCase();
    const cached = urlCache.get(key);
    if (cached) {
      resolved.push(cached);
      continue;
    }
    if (!zipLookup) {
      throw new Error(`Image "${ref}" requires an images ZIP.`);
    }
    const localPath = zipLookup.get(key);
    if (!localPath) {
      throw new Error(`Image "${ref}" not found in ZIP.`);
    }
    const publicUrl = await uploadImportZipImage(localPath, productHandle);
    urlCache.set(key, publicUrl);
    resolved.push(publicUrl);
  }
  return resolved;
}

function parseYesNo(value: string, fallback: boolean): boolean | null {
  const key = normalizeKey(value);
  if (!key) return fallback;
  if (['yes', 'y', 'true', '1', 'on'].includes(key)) return true;
  if (['no', 'n', 'false', '0', 'off'].includes(key)) return false;
  return null;
}

function parsePaymentOption(value: string): 'cod' | 'prepaid' | 'both' | null {
  const key = normalizeKey(value).replace(/\s+/g, '');
  if (!key) return 'both';
  if (key === 'cod' || key === 'cashondelivery') return 'cod';
  if (key === 'prepaid' || key === 'online' || key === 'card') return 'prepaid';
  if (key === 'both' || key === 'all' || key === 'codprepaid') return 'both';
  return null;
}

function isDuplicateKeyError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const record = error as { code?: number; message?: string };
  return (
    record.code === 11000 ||
    (typeof record.message === 'string' && record.message.includes('E11000'))
  );
}

/** Parses `Fit: Slim | Fabric care: Machine Wash` into specification rows. */
function parseSpecifications(
  value: string,
): Array<{ name: string; value: string; sortOrder: number }> {
  if (!value.trim()) return [];
  const parts = value
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean);
  const rows: Array<{ name: string; value: string; sortOrder: number }> = [];
  for (const [index, part] of parts.entries()) {
    const colon = part.indexOf(':');
    if (colon === -1) continue;
    const name = part.slice(0, colon).trim();
    const specValue = part.slice(colon + 1).trim();
    if (!name || !specValue) continue;
    rows.push({ name, value: specValue, sortOrder: index });
  }
  return rows;
}

/**
 * Build combined specifications: Fit + Fabric Care (from named columns) +
 * Additional Specifications (from the pipe-delimited column).
 */
function buildSpecifications(values: Partial<Record<ImportColumnKey, string>>): Array<{
  name: string;
  value: string;
  sortOrder: number;
}> {
  const specs: Array<{ name: string; value: string; sortOrder: number }> = [];
  let order = 0;

  const fit = values.fit?.trim();
  if (fit) specs.push({ name: 'Fit', value: fit, sortOrder: order++ });

  const care = values.fabricCare?.trim();
  if (care) specs.push({ name: 'Fabric Care', value: care, sortOrder: order++ });

  const extra = parseSpecifications(values.specifications ?? '');
  for (const spec of extra) {
    specs.push({ ...spec, sortOrder: order++ });
  }

  return specs;
}

async function ensureOfficialBrandId(): Promise<string> {
  const existing = await BrandModel.findOne({
    isDeleted: false,
    $or: [
      { slug: OFFICIAL_BRAND_SLUG },
      { name: new RegExp(`^${OFFICIAL_BRAND_NAME.replace(/\./g, '\\.')}$`, 'i') },
    ],
  });
  if (existing) {
    if (existing.name !== OFFICIAL_BRAND_NAME || existing.slug !== OFFICIAL_BRAND_SLUG) {
      existing.set({ name: OFFICIAL_BRAND_NAME, slug: OFFICIAL_BRAND_SLUG, status: 'active' });
      await existing.save();
    }
    return String(existing._id);
  }
  const created = await BrandModel.create({
    name: OFFICIAL_BRAND_NAME,
    slug: OFFICIAL_BRAND_SLUG,
    status: 'active',
    sortOrder: 0,
  });
  return String(created._id);
}

/* -------------------------------------------------------------------------- */
/* Sheet -> rows                                                              */
/* -------------------------------------------------------------------------- */

type RawRow = { row: number; values: Partial<Record<ImportColumnKey, string>> };

async function readSheet(file: Express.Multer.File): Promise<string[][]> {
  const isCsv =
    file.mimetype === 'text/csv' ||
    file.mimetype === 'application/csv' ||
    /\.csv$/i.test(file.originalname ?? '');

  const buffer =
    file.buffer && file.buffer.length > 0
      ? file.buffer
      : file.path
        ? await readFile(file.path)
        : null;
  if (!buffer) {
    throw ApiError.badRequest('Uploaded file has no content.', undefined, 'IMPORT_FILE_EMPTY');
  }

  if (isCsv) return parseCsv(buffer.toString('utf8'));

  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  } catch {
    throw ApiError.badRequest(
      'That file could not be read. Save it as .xlsx or .csv and try again.',
      undefined,
      'IMPORT_FILE_UNREADABLE',
    );
  }

  const worksheet =
    workbook.worksheets.find((sheet) => normalizeHeader(sheet.name) === 'products') ??
    workbook.worksheets[0];
  if (!worksheet) {
    throw ApiError.badRequest('The workbook has no sheets.', undefined, 'IMPORT_FILE_EMPTY');
  }

  const grid: string[][] = [];
  worksheet.eachRow({ includeEmpty: false }, (row) => {
    const cells: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cells[colNumber - 1] = cellToString(cell.value);
    });
    grid.push(Array.from(cells, (cell) => cell ?? ''));
  });
  return grid;
}

function toRawRows(grid: string[][]): { rows: RawRow[]; headers: ImportColumnKey[] } {
  const headerRowIndex = grid.findIndex((row) =>
    row.some((cell) => HEADER_LOOKUP.has(normalizeHeader(cell ?? ''))),
  );
  if (headerRowIndex === -1) {
    throw ApiError.badRequest(
      'No recognisable header row found. Download the template and keep its first row intact.',
      undefined,
      'IMPORT_HEADERS_MISSING',
    );
  }

  const headerRow = grid[headerRowIndex] ?? [];
  const headers = headerRow.map((cell) => HEADER_LOOKUP.get(normalizeHeader(cell ?? '')));

  if (!headers.includes('name')) {
    throw ApiError.badRequest(
      'The sheet needs a "Product Name" column.',
      undefined,
      'IMPORT_HEADERS_MISSING',
    );
  }

  const rows: RawRow[] = [];
  for (let index = headerRowIndex + 1; index < grid.length; index += 1) {
    const cells = grid[index] ?? [];
    const values: Partial<Record<ImportColumnKey, string>> = {};
    let hasContent = false;
    headers.forEach((key, columnIndex) => {
      if (!key) return;
      const raw = (cells[columnIndex] ?? '').trim();
      if (!raw) return;
      values[key] = raw;
      hasContent = true;
    });
    if (!hasContent) continue;
    rows.push({ row: index + 1, values });
  }

  if (!rows.length) {
    throw ApiError.badRequest(
      'The sheet has headers but no product rows.',
      undefined,
      'IMPORT_FILE_EMPTY',
    );
  }
  if (rows.length > MAX_ROWS) {
    throw ApiError.badRequest(
      `The sheet has ${rows.length} rows. Split it into files of ${MAX_ROWS} rows or fewer.`,
      undefined,
      'IMPORT_TOO_LARGE',
    );
  }

  return { rows, headers: headers.filter((key): key is ImportColumnKey => Boolean(key)) };
}

/* -------------------------------------------------------------------------- */
/* Rows -> validated products                                                 */
/* -------------------------------------------------------------------------- */

function buildProducts(
  rows: RawRow[],
  zipLookup: Map<string, string> | null = null,
): { products: ImportProductInput[]; issues: ImportIssue[] } {
  const issues: ImportIssue[] = [];
  const products = new Map<string, ImportProductInput>();
  const seenVariants = new Map<string, Set<string>>();
  const usedSlugs = new Map<string, string>();
  // Track SKUs used in this file to catch intra-file duplicates
  const usedSkus = new Map<string, number>();

  for (const { row, values } of rows) {
    const name = values.name ?? '';
    if (!name) {
      issues.push({ row, column: 'Product Name', message: 'Product name is required.' });
      continue;
    }

    const handle = normalizeKey(values.handle ?? name);

    // ── Prices ──────────────────────────────────────────────────────────────
    const price = parseMoney(values.price ?? '');
    if (price === null) {
      issues.push({
        row,
        column: 'Selling Price',
        message: 'Selling price is required and must be a number.',
      });
      continue;
    }
    if (price <= 0) {
      issues.push({
        row,
        column: 'Selling Price',
        message: 'Selling price must be greater than 0.',
      });
      continue;
    }

    const salePriceRaw = values.salePrice ?? '';
    const salePrice = salePriceRaw ? parseMoney(salePriceRaw) : null;
    if (salePriceRaw && salePrice === null) {
      issues.push({ row, column: 'Sale Price', message: 'Sale price must be a number.' });
      continue;
    }
    if (salePrice !== null && salePrice > price) {
      issues.push({
        row,
        column: 'Sale Price',
        message: `Sale price (${salePrice}) cannot be higher than selling price (${price}).`,
      });
      continue;
    }

    const comparePriceRaw = values.comparePrice ?? '';
    const comparePrice = comparePriceRaw ? parseMoney(comparePriceRaw) : null;
    if (comparePriceRaw && comparePrice === null) {
      issues.push({ row, column: 'Compare Price', message: 'Compare price must be a number.' });
      continue;
    }

    // ── Stock ───────────────────────────────────────────────────────────────
    const stockRaw = values.stock ?? '';
    const stock = stockRaw ? parseWholeNumber(stockRaw) : 0;
    if (stock === null || stock < 0) {
      issues.push({ row, column: 'Stock', message: 'Stock must be a whole number of 0 or more.' });
      continue;
    }

    // ── Images ──────────────────────────────────────────────────────────────
    const images = splitList(values.images ?? '');
    let imageError: string | null = null;
    for (const ref of images) {
      const check = validateImageRef(ref, zipLookup);
      if (!check.ok) {
        imageError = check.message;
        break;
      }
    }
    if (imageError) {
      issues.push({
        row,
        column: 'Images',
        message: imageError,
      });
      continue;
    }

    // ── SKU duplicate check ─────────────────────────────────────────────────
    const sku = values.sku?.trim() ?? '';
    if (sku) {
      const prevRow = usedSkus.get(sku.toUpperCase());
      if (prevRow !== undefined) {
        issues.push({
          row,
          column: 'Variant SKU',
          message: `SKU "${sku}" is already used on row ${prevRow} of this sheet. SKUs must be unique.`,
        });
        continue;
      }
      usedSkus.set(sku.toUpperCase(), row);
    }

    // ── Positions ───────────────────────────────────────────────────────────
    const displayOrder = parseWholeNumber(values.displayOrder ?? '') ?? 0;
    const variantPosition = parseWholeNumber(values.variantPosition ?? '') ?? 0;

    // ── Boolean flags ────────────────────────────────────────────────────────
    const ownListing = parseYesNo(values.ownListing ?? '', false) ?? false;
    const defaultListing = parseYesNo(values.defaultListing ?? '', false) ?? false;
    const isBestSeller = parseYesNo(values.isBestSeller ?? '', false) ?? false;
    const isMoreToLove = parseYesNo(values.isMoreToLove ?? '', false) ?? false;
    const isFeatured = parseYesNo(values.isFeatured ?? '', false) ?? false;

    let existing = products.get(handle);
    if (!existing) {
      // ── Product-level fields (only parsed on first row of a product) ───────
      const category = values.category ?? '';
      if (!category) {
        issues.push({ row, column: 'Category', message: 'Category is required.' });
        continue;
      }

      const genderRaw = values.gender ?? '';
      const gender = genderRaw ? (GENDER_ALIASES[normalizeKey(genderRaw)] ?? '') : '';
      if (genderRaw && !gender) {
        issues.push({
          row,
          column: 'Gender',
          message: `"${genderRaw}" is not valid. Use women, men, unisex or kids.`,
        });
        continue;
      }

      const statusRaw = values.status ?? '';
      const status = statusRaw ? normalizeKey(statusRaw) : PRODUCT_STATUS.DRAFT;
      if (!ALLOWED_STATUSES.has(status)) {
        issues.push({
          row,
          column: 'Status',
          message: `"${statusRaw}" is not valid. Use draft or active.`,
        });
        continue;
      }

      const visibilityRaw = values.visibility ?? '';
      const visibility = visibilityRaw
        ? normalizeKey(visibilityRaw).replace(/\s/g, '_')
        : PRODUCT_VISIBILITY.PUBLIC;
      if (visibilityRaw && !ALLOWED_VISIBILITIES.has(visibility)) {
        issues.push({
          row,
          column: 'Visibility',
          message: `"${visibilityRaw}" is not valid. Use public, hidden or catalog_only.`,
        });
        continue;
      }

      const paymentOption = parsePaymentOption(values.paymentMethod ?? '');
      if (paymentOption === null) {
        issues.push({
          row,
          column: 'Payment Method',
          message: `"${values.paymentMethod}" is not valid. Use cod, prepaid or both.`,
        });
        continue;
      }

      const returnsAvailable = parseYesNo(values.returns ?? '', true);
      if (returnsAvailable === null) {
        issues.push({
          row,
          column: 'Returns',
          message: `"${values.returns}" is not valid. Use yes or no.`,
        });
        continue;
      }

      const warrantyAvailable = parseYesNo(values.warranty ?? '', false);
      if (warrantyAvailable === null) {
        issues.push({
          row,
          column: 'Warranty',
          message: `"${values.warranty}" is not valid. Use yes or no.`,
        });
        continue;
      }

      const slug = slugify(values.handle ? values.handle : name);
      const slugOwner = usedSlugs.get(slug);
      if (slugOwner && slugOwner !== handle) {
        issues.push({
          row,
          column: 'Product Name',
          message: `"${name}" produces the same web address as "${slugOwner}". Give one of them a different Handle.`,
        });
        continue;
      }
      usedSlugs.set(slug, handle);

      existing = {
        handle,
        name,
        slug,
        category,
        gender,
        brand: values.brand?.trim() || OFFICIAL_BRAND_NAME,
        material: values.material ?? '',
        occasions: splitList(values.occasions ?? ''),
        tags: splitList(values.tags ?? ''),
        shortDescription: values.shortDescription ?? '',
        description: values.description ?? '',
        specifications: buildSpecifications(values),
        seoTitle: values.seoTitle ?? '',
        seoDescription: values.seoDescription ?? '',
        paymentOption,
        returnsAvailable,
        returnsCriteria: values.returnPolicy ?? '',
        warrantyAvailable,
        warrantyDetails: values.warrantyDetails ?? '',
        status,
        visibility,
        isBestSeller,
        isMoreToLove,
        isFeatured,
        rows: [],
        variants: [],
      };
      products.set(handle, existing);
      seenVariants.set(handle, new Set());
    }

    const color = values.color ?? '';
    const size = values.size ?? '';
    const variantKey = `${normalizeKey(color)}::${normalizeKey(size)}`;
    const seen = seenVariants.get(handle);
    if (seen?.has(variantKey)) {
      issues.push({
        row,
        message: `${name} already has a "${color || 'no colour'} / ${size || 'no size'}" row. Remove the duplicate.`,
      });
      continue;
    }
    seen?.add(variantKey);

    // Only one default listing per product — use the last one that has TRUE
    if (defaultListing) {
      // Clear any previous default on this product
      for (const v of existing.variants) {
        v.defaultListing = false;
      }
    }

    existing.rows.push(row);
    existing.variants.push({
      row,
      color,
      size,
      price,
      salePrice,
      comparePrice,
      stock,
      sku,
      images,
      ownListing,
      defaultListing,
      displayOrder,
      variantPosition,
    });
  }

  // Image inheritance: reuse first color's images on subsequent same-color rows
  for (const product of products.values()) {
    const colorImages = new Map<string, string[]>();
    for (const variant of product.variants) {
      const colorKey = normalizeKey(variant.color || '__nocolor__');
      if (variant.images.length > 0) {
        colorImages.set(colorKey, variant.images);
      } else {
        const inherited = colorImages.get(colorKey);
        if (inherited) variant.images = inherited;
      }
    }
  }

  return { products: [...products.values()], issues };
}

/* -------------------------------------------------------------------------- */
/* Master data resolution                                                     */
/* -------------------------------------------------------------------------- */

type LookupModel = typeof BrandModel;

async function loadLookup(model: LookupModel): Promise<Map<string, string>> {
  const rows = await model.find({ isDeleted: false }).select('name slug').lean();
  const map = new Map<string, string>();
  for (const row of rows) {
    const record = row as unknown as { _id: unknown; name?: string; slug?: string };
    const id = String(record._id);
    if (record.name) map.set(normalizeKey(record.name), id);
    if (record.slug) map.set(normalizeKey(record.slug), id);
  }
  return map;
}

async function createLookup(
  model: LookupModel,
  name: string,
  options: { withCode: boolean },
): Promise<string> {
  const baseSlug = slugify(name) || `item-${Date.now().toString(36)}`;
  let slug = baseSlug;
  for (let attempt = 1; await model.exists({ slug }); attempt += 1) {
    slug = `${baseSlug}-${attempt}`;
    if (attempt > 50) {
      slug = `${baseSlug}-${Date.now().toString(36)}`;
      break;
    }
  }

  const payload: Record<string, unknown> = { name: name.trim(), slug, status: 'active' };
  if (options.withCode) payload.code = slug.toUpperCase().slice(0, 40);

  const created = await model.create(payload);
  return String(created._id);
}

class LookupCache {
  constructor(
    private readonly model: LookupModel,
    private readonly entries: Map<string, string>,
    private readonly withCode: boolean,
  ) {}

  get(name: string): string | undefined {
    return this.entries.get(normalizeKey(name));
  }

  async ensure(name: string): Promise<string> {
    const key = normalizeKey(name);
    const existing = this.entries.get(key);
    if (existing) return existing;
    const id = await createLookup(this.model, name, { withCode: this.withCode });
    this.entries.set(key, id);
    return id;
  }
}

async function buildLookups() {
  const [categories, brands, colors, sizes, materials, occasions] = await Promise.all([
    loadLookup(CategoryModel as unknown as LookupModel),
    loadLookup(BrandModel),
    loadLookup(ColorModel as unknown as LookupModel),
    loadLookup(SizeModel as unknown as LookupModel),
    loadLookup(MaterialModel as unknown as LookupModel),
    loadLookup(OccasionModel),
  ]);

  return {
    categories: new LookupCache(CategoryModel as unknown as LookupModel, categories, false),
    brands: new LookupCache(BrandModel, brands, false),
    colors: new LookupCache(ColorModel as unknown as LookupModel, colors, true),
    sizes: new LookupCache(SizeModel as unknown as LookupModel, sizes, true),
    materials: new LookupCache(MaterialModel as unknown as LookupModel, materials, true),
    occasions: new LookupCache(OccasionModel, occasions, false),
  };
}

/* -------------------------------------------------------------------------- */
/* Service                                                                    */
/* -------------------------------------------------------------------------- */

export class ProductImportService {
  /** Parse + validate a sheet without writing anything. */
  async preview(
    file: Express.Multer.File,
    imagesZip?: Express.Multer.File,
  ): Promise<ImportPreview> {
    let zipSession: ImportZipSession | null = null;
    let zipLookup: Map<string, string> | null = null;
    const zipIssues: ImportIssue[] = [];

    if (imagesZip?.path) {
      const { session, issues: extractIssues } = await createImportZipSession(imagesZip.path);
      zipSession = session;
      zipLookup = session.lookup;
      for (const message of extractIssues) {
        zipIssues.push({ row: 0, column: 'Images ZIP', message });
      }
    }

    const grid = await readSheet(file);
    const { rows } = toRawRows(grid);
    const { products, issues } = buildProducts(rows, zipLookup);
    issues.push(...zipIssues);

    const lookups = await buildLookups();
    const newColors = new Set<string>();
    const newSizes = new Set<string>();
    const newBrands = new Set<string>();
    const missingCategories = new Set<string>();

    for (const product of products) {
      const firstRow = product.rows[0] ?? 0;
      if (!lookups.categories.get(product.category)) {
        missingCategories.add(product.category);
        issues.push({
          row: firstRow,
          column: 'Category',
          message: `Category "${product.category}" does not exist. Create it first, or use one from the Reference sheet.`,
        });
      }
      if (product.brand && !lookups.brands.get(product.brand)) newBrands.add(product.brand);
      for (const variant of product.variants) {
        if (variant.color && !lookups.colors.get(variant.color)) newColors.add(variant.color);
        if (variant.size && !lookups.sizes.get(variant.size)) newSizes.add(variant.size);
      }
    }

    // Check DB-level SKU duplicates
    const skusFromSheet = products.flatMap((p) =>
      p.variants.filter((v) => v.sku).map((v) => v.sku.toUpperCase()),
    );
    if (skusFromSheet.length) {
      const { ProductVariantModel } = await import('@/models/product.models');
      const existingSkus = await ProductVariantModel.find({
        sku: { $in: skusFromSheet },
        isDeleted: false,
      })
        .select('sku')
        .lean();
      for (const row of existingSkus) {
        const skuVal = String((row as { sku?: string }).sku ?? '');
        if (skuVal) {
          issues.push({
            row: 0,
            column: 'Variant SKU',
            message: `SKU "${skuVal}" already exists in the database. Remove or change it.`,
          });
        }
      }
    }

    const slugs = products.map((p) => p.slug);
    const existing = slugs.length
      ? await ProductModel.find({ slug: { $in: slugs }, isDeleted: false })
          .select('slug')
          .lean()
      : [];
    const duplicates = new Set(existing.map((row) => String(row.slug)));

    const variants = products.reduce((total, p) => total + p.variants.length, 0);
    const stockUnits = products.reduce(
      (total, p) => total + p.variants.reduce((sum, v) => sum + (v.stock ?? 0), 0),
      0,
    );
    const images = products.reduce(
      (total, p) => total + p.variants.reduce((sum, v) => sum + v.images.length, 0),
      0,
    );

    return {
      products,
      issues: issues.sort((a, b) => a.row - b.row),
      duplicates: [...duplicates],
      newValues: {
        categories: [...missingCategories],
        colors: [...newColors],
        sizes: [...newSizes],
        brands: [...newBrands],
      },
      summary: {
        rows: rows.length,
        products: products.length,
        variants,
        stockUnits,
        images,
        issues: issues.length,
        duplicates: duplicates.size,
      },
      imagesSessionId: zipSession?.id ?? null,
      zipSummary: zipSession ? { imageCount: zipSession.imageCount } : null,
    };
  }

  /** Create one batch of previously validated products. */
  async importProducts(
    products: ImportProductInput[],
    actor: ActorMeta,
    options: {
      publish?: boolean;
      imagesSessionId?: string;
      imagesZip?: Express.Multer.File;
    } = {},
  ): Promise<{ results: ImportProductResult[] }> {
    if (products.length > PRODUCT_IMPORT_BATCH_LIMIT) {
      throw ApiError.badRequest(
        `Import at most ${PRODUCT_IMPORT_BATCH_LIMIT} products per request.`,
        undefined,
        'IMPORT_BATCH_TOO_LARGE',
      );
    }

    let zipLookup: Map<string, string> | null = null;
    if (options.imagesZip?.path) {
      const { session } = await createImportZipSession(options.imagesZip.path);
      zipLookup = session.lookup;
    } else if (options.imagesSessionId) {
      const session = getImportZipSession(options.imagesSessionId);
      if (!session) {
        throw ApiError.badRequest(
          'Images ZIP session expired. Upload the spreadsheet and ZIP again, then preview.',
          undefined,
          'ZIP_SESSION_EXPIRED',
        );
      }
      zipLookup = session.lookup;
    }

    const needsZip = products.some((product) =>
      product.variants.some((variant) => variant.images.some((ref) => !isHttpUrl(ref))),
    );
    if (needsZip && !zipLookup) {
      throw ApiError.badRequest(
        'This import includes image filenames. Upload an images ZIP (or use the session from preview).',
        undefined,
        'ZIP_REQUIRED',
      );
    }

    const lookups = await buildLookups();
    const results: ImportProductResult[] = [];
    const urlCache = new Map<string, string>();

    for (const product of products) {
      const row = product.rows[0] ?? 0;
      let createdProductId: string | null = null;

      try {
        // Upload ZIP filenames to R2 first, then keep URL-only attach path
        const resolvedVariants = [];
        for (const variant of product.variants) {
          const urls = await resolveImportImageUrls(
            variant.images,
            product.handle,
            zipLookup,
            urlCache,
          );
          resolvedVariants.push({ ...variant, images: urls });
        }

        const categoryId = lookups.categories.get(product.category);
        if (!categoryId) {
          results.push({
            handle: product.handle,
            name: product.name,
            row,
            status: 'failed',
            message: `Category "${product.category}" does not exist.`,
          });
          continue;
        }

        const activeDuplicate = await ProductModel.exists({ slug: product.slug, isDeleted: false });
        if (activeDuplicate) {
          results.push({
            handle: product.handle,
            name: product.name,
            row,
            status: 'skipped',
            message:
              'A live product with this name/URL already exists. Rename it or delete the old one first.',
          });
          continue;
        }

        let slug = product.slug;
        if (await ProductModel.exists({ slug })) {
          slug = `${product.slug}-${Date.now().toString(36)}`;
        }

        const brandName = product.brand?.trim() || OFFICIAL_BRAND_NAME;
        const brandId =
          normalizeKey(brandName) === normalizeKey(OFFICIAL_BRAND_NAME) ||
          normalizeKey(brandName) === normalizeKey(OFFICIAL_BRAND_SLUG)
            ? await ensureOfficialBrandId()
            : await lookups.brands.ensure(brandName);

        const materialId = product.material
          ? await lookups.materials.ensure(product.material)
          : undefined;

        const occasionIds: string[] = [];
        for (const occasion of product.occasions) {
          occasionIds.push(await lookups.occasions.ensure(occasion));
        }

        const prices = resolvedVariants.map((v) => v.price);
        const basePrice = prices.length ? Math.min(...prices) : 0;
        const baseVariant = resolvedVariants.find((v) => v.price === basePrice);

        const created = await productService.create(
          {
            name: product.name,
            slug,
            shortDescription: product.shortDescription || undefined,
            description: product.description || undefined,
            categoryId,
            categoryIds: [categoryId],
            brandId,
            materialId,
            occasionIds,
            gender: product.gender || undefined,
            tags: product.tags,
            paymentOption: product.paymentOption,
            returnsAvailable: product.returnsAvailable,
            returnsCriteria: product.returnsCriteria || null,
            warrantyAvailable: product.warrantyAvailable,
            warrantyDetails: product.warrantyDetails || null,
            specifications: product.specifications,
            seo: {
              title: product.seoTitle || product.name,
              description: product.seoDescription || product.shortDescription || undefined,
            },
            status: options.publish ? PRODUCT_STATUS.ACTIVE : product.status,
            visibility: product.visibility,
            isBestSeller: product.isBestSeller,
            isMoreToLove: product.isMoreToLove,
            isFeatured: product.isFeatured,
            price: basePrice,
            salePrice: baseVariant?.salePrice ?? undefined,
            compareAtPrice: baseVariant?.comparePrice ?? undefined,
            currency: 'LKR',
          },
          actor,
        );

        createdProductId = String(created._id);
        const productId = createdProductId;
        let primaryAssigned = false;

        // Resolve the "default" variant (explicit flag wins; else first row)
        const explicitDefault = resolvedVariants.findIndex((v) => v.defaultListing);
        const defaultIndex = explicitDefault >= 0 ? explicitDefault : 0;

        // Group images per color to handle inheritance at write time
        const colorFirstImageSet = new Map<string, boolean>();

        // Sort variants by variantPosition if provided
        const sortedVariants = [...resolvedVariants].sort(
          (a, b) => (a.variantPosition || 0) - (b.variantPosition || 0),
        );

        for (const [index, variant] of sortedVariants.entries()) {
          const isDefaultVariant = index === defaultIndex;
          const [colorId, sizeId] = await Promise.all([
            variant.color ? lookups.colors.ensure(variant.color) : Promise.resolve(null),
            variant.size ? lookups.sizes.ensure(variant.size) : Promise.resolve(null),
          ]);

          const title = [variant.color, variant.size].filter(Boolean).join(' / ') || product.name;

          const createdVariant = await productVariantService.create(
            productId,
            {
              title,
              colorId,
              sizeId,
              price: variant.price,
              salePrice: variant.salePrice ?? undefined,
              compareAtPrice: variant.comparePrice ?? undefined,
              currency: 'LKR',
              sku: variant.sku || undefined,
              displayOrder: variant.displayOrder || index,
              isDefault: isDefaultVariant,
              listSeparately: variant.ownListing,
            },
            actor,
          );

          const variantId = String(createdVariant._id);

          if (variant.stock !== null && variant.stock > 0) {
            await inventoryService.setStockQuantity({ variantId, quantity: variant.stock }, actor);
          }

          // Attach images — download→storage with remote fallback
          if (variant.images.length > 0) {
            const colorKey = normalizeKey(variant.color || '__nocolor__');
            const isFirstForColor = !colorFirstImageSet.has(colorKey);
            colorFirstImageSet.set(colorKey, true);

            await attachImportImages({
              productId,
              variantId,
              altText: title,
              urls: variant.images,
              priorityBase: index * 10,
              setPrimary: !primaryAssigned && isFirstForColor,
            });
            primaryAssigned = true;
          }
        }

        results.push({
          handle: product.handle,
          name: product.name,
          row,
          status: 'created',
          productId,
          variants: resolvedVariants.length,
        });
      } catch (error) {
        // If product was created but variants/media failed, clean up
        if (createdProductId) {
          try {
            await ProductModel.findByIdAndUpdate(createdProductId, {
              $set: { isDeleted: true, deletedAt: new Date() },
            });
          } catch {
            // best effort cleanup
          }
        }
        results.push({
          handle: product.handle,
          name: product.name,
          row,
          status: isDuplicateKeyError(error) ? 'skipped' : 'failed',
          message: isDuplicateKeyError(error)
            ? 'A product with this web address already exists. Rename the product or set a unique Handle.'
            : error instanceof Error
              ? error.message
              : 'Unknown error',
        });
      }
    }

    return { results };
  }

  /** Sample images ZIP matching the template filename examples. */
  async buildSampleImagesZip(): Promise<Buffer> {
    return buildSampleImagesZip();
  }

  /** Full 3-sheet Excel template with Products, Reference, and Instructions. */
  async buildTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'FE Admin';
    workbook.created = new Date();

    // ── Sheet 1: Products ──────────────────────────────────────────────────
    const sheet = workbook.addWorksheet('Products');
    sheet.columns = IMPORT_COLUMNS.map((col) => ({
      header: col.label,
      key: col.key,
      width: Math.max(16, Math.min(40, col.label.length + 12)),
    }));
    const header = sheet.getRow(1);
    header.font = { bold: true };
    header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A1A2E' } };
    header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    header.alignment = { vertical: 'middle', wrapText: false };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];

    const [category] = await CategoryModel.find({ isDeleted: false, status: 'active' })
      .select('name')
      .limit(1)
      .lean();
    const exampleCategory = (category as { name?: string } | undefined)?.name ?? 'Crop tops';
    const exampleName = `Bulk Template Sample Top ${new Date().toISOString().slice(0, 10)}`;
    const sampleImage1 = 'shirt-black-front.jpg';
    const sampleImage2 = 'shirt-black-back.jpg';
    const sampleImage3 = 'shirt-white-front.jpg';

    // Row 1: Pink / S (with full product-level fields)
    sheet.addRow({
      name: exampleName,
      handle: '',
      shortDescription: 'Soft ruffle crop top',
      description: 'Replace these rows with your real catalogue.',
      status: 'draft',
      visibility: 'public',
      category: exampleCategory,
      gender: 'women',
      brand: OFFICIAL_BRAND_NAME,
      material: 'Cotton',
      occasions: 'Casual, Party',
      tags: 'sample, new',
      price: 9999,
      salePrice: 7999,
      comparePrice: 11999,
      color: 'Hot Pink',
      size: 'S',
      stock: 10,
      sku: '',
      ownListing: 'TRUE',
      defaultListing: 'TRUE',
      isBestSeller: 'FALSE',
      isMoreToLove: 'FALSE',
      isFeatured: 'FALSE',
      fit: 'Regular',
      fabricCare: 'Machine Wash Cold',
      specifications: 'Neckline: Round Neck | Sleeve: Short Sleeve',
      seoTitle: `${exampleName} | FE`,
      seoDescription: 'Soft ruffle crop top available in multiple colours and sizes.',
      returns: 'yes',
      returnPolicy: '7-day exchange if unused with tags',
      warranty: 'no',
      warrantyDetails: '',
      paymentMethod: 'both',
      images: `${sampleImage1}, ${sampleImage2}`,
      displayOrder: 1,
      variantPosition: 1,
      productPosition: 1,
    });
    // Row 2: Pink / M (inherits images — leave blank)
    sheet.addRow({
      name: exampleName,
      color: 'Hot Pink',
      size: 'M',
      price: 9999,
      salePrice: 7999,
      stock: 6,
      ownListing: 'TRUE',
      displayOrder: 2,
      variantPosition: 2,
    });
    // Row 3: Blue / S (new color, new images)
    sheet.addRow({
      name: exampleName,
      color: 'Blue',
      size: 'S',
      price: 9999,
      stock: 4,
      ownListing: 'TRUE',
      images: sampleImage3,
      displayOrder: 1,
      variantPosition: 3,
    });
    // Row 4: Blue / M (inherits Blue images)
    sheet.addRow({
      name: exampleName,
      color: 'Blue',
      size: 'M',
      price: 9999,
      stock: 5,
      ownListing: 'TRUE',
      displayOrder: 2,
      variantPosition: 4,
    });

    // Mark required columns in yellow
    const reqCols = new Set(IMPORT_COLUMNS.filter((c) => c.required).map((c) => c.key));
    sheet.getRow(1).eachCell((cell, colNumber) => {
      const colDef = IMPORT_COLUMNS[colNumber - 1];
      if (colDef && reqCols.has(colDef.key)) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCC8800' } };
      }
    });

    // ── Sheet 2: Reference ─────────────────────────────────────────────────
    const reference = workbook.addWorksheet('Reference');
    reference.columns = [
      { header: 'Categories (required)', key: 'category', width: 34 },
      { header: 'Category Slug', key: 'categorySlug', width: 26 },
      { header: 'Brands', key: 'brand', width: 24 },
      { header: 'Materials / Fabric', key: 'material', width: 24 },
      { header: 'Occasions', key: 'occasion', width: 24 },
      { header: 'Sizes', key: 'size', width: 16 },
      { header: 'Colors', key: 'color', width: 20 },
      { header: 'Allowed Status', key: 'status', width: 18 },
      { header: 'Allowed Gender', key: 'gender', width: 18 },
      { header: 'Allowed Visibility', key: 'visibility', width: 22 },
      { header: 'Allowed Payment', key: 'payment', width: 20 },
    ];
    reference.getRow(1).font = { bold: true };
    reference.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F1F1' } };

    const [categories, brands, materials, occasions, sizes, colors] = await Promise.all([
      CategoryModel.find({ isDeleted: false, status: 'active' })
        .select('name slug')
        .sort({ name: 1 })
        .lean(),
      BrandModel.find({ isDeleted: false }).select('name').sort({ name: 1 }).lean(),
      MaterialModel.find({ isDeleted: false }).select('name').sort({ name: 1 }).lean(),
      OccasionModel.find({ isDeleted: false }).select('name').sort({ name: 1 }).lean(),
      SizeModel.find({ isDeleted: false }).select('name').sort({ name: 1 }).lean(),
      ColorModel.find({ isDeleted: false }).select('name').sort({ name: 1 }).lean(),
    ]);

    const staticStatus = ['draft', 'active'];
    const staticGender = ['women', 'men', 'unisex', 'kids'];
    const staticVisibility = ['public', 'hidden', 'catalog_only'];
    const staticPayment = ['both', 'cod', 'prepaid'];

    const nameOf = (row: unknown) => String((row as { name?: string })?.name ?? '');
    const slugOf = (row: unknown) => String((row as { slug?: string })?.slug ?? '');
    const rowCount = Math.max(
      categories.length,
      brands.length,
      materials.length,
      occasions.length,
      sizes.length,
      colors.length,
      staticStatus.length,
    );
    for (let i = 0; i < rowCount; i += 1) {
      reference.addRow({
        category: nameOf(categories[i]),
        categorySlug: slugOf(categories[i]),
        brand: nameOf(brands[i]),
        material: nameOf(materials[i]),
        occasion: nameOf(occasions[i]),
        size: nameOf(sizes[i]),
        color: nameOf(colors[i]),
        status: staticStatus[i] ?? '',
        gender: staticGender[i] ?? '',
        visibility: staticVisibility[i] ?? '',
        payment: staticPayment[i] ?? '',
      });
    }

    // ── Sheet 3: Instructions ──────────────────────────────────────────────
    const instructions = workbook.addWorksheet('Instructions');
    instructions.columns = [
      { header: 'Topic', key: 'topic', width: 26 },
      { header: 'Explanation', key: 'explanation', width: 90 },
    ];
    instructions.getRow(1).font = { bold: true };
    instructions.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1A1A2E' },
    };
    instructions.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    const instructionRows: Array<{ topic: string; explanation: string }> = [
      {
        topic: 'Overview',
        explanation:
          'One Excel row = one Color + Size variant. Rows that share the same Product Name (or Handle) become ONE product with many variants.',
      },
      {
        topic: 'Required columns',
        explanation:
          'Product Name, Category, Selling Price are required on every row. All other columns are optional.',
      },
      {
        topic: 'Adding variants',
        explanation:
          'To add multiple sizes to one color: repeat the Product Name, same Color, different Size on each row. To add multiple colors: repeat the Product Name, new Color, and new images.',
      },
      {
        topic: 'Adding colors',
        explanation:
          'Each color should appear on its own row. Use Own Listing = TRUE to show the color as a separate product card on the storefront.',
      },
      {
        topic: 'Default Listing',
        explanation:
          'Set Default Listing = TRUE on exactly one color row per product. This controls which card appears in category listings. If none is set, the first variant becomes default.',
      },
      {
        topic: 'Multiple images',
        explanation:
          'In the Images column use comma-separated HTTPS links and/or ZIP filenames. Example: https://cdn.example.com/img1.jpg or shirt-front.jpg,shirt-back.jpg. Filenames must match files inside the optional images ZIP uploaded with the sheet.',
      },
      {
        topic: 'Images ZIP (optional)',
        explanation:
          'Upload a .zip of product images together with the spreadsheet. Put image filenames (not full URLs) in the Images column. During import, files are uploaded to storage and attached automatically. Preview never uploads images.',
      },
      {
        topic: 'Image inheritance',
        explanation:
          'Leave Images blank on same-color rows. The first image set for that color is automatically reused for every size of that color. Later rows may specify different filenames for variant-specific images.',
      },
      {
        topic: 'Specifications',
        explanation:
          'Use Additional Specifications for detail rows in the format: Name: Value | Name: Value. Fit and Fabric Care have their own shortcut columns.',
      },
      {
        topic: 'Fit & Fabric Care',
        explanation:
          'Fill the Fit column (e.g. Regular, Slim Fit) and the Fabric Care column (e.g. Machine Wash Cold) to auto-add those as product specifications.',
      },
      {
        topic: 'Homepage sections',
        explanation:
          'Set Homepage Best Seller / More To Love / Featured = TRUE to feature the product in those homepage sections.',
      },
      {
        topic: 'Duplicate rows',
        explanation:
          'Each Color + Size combination must be unique per product. Remove exact duplicate rows before uploading.',
      },
      {
        topic: 'Categories',
        explanation:
          'Categories must already exist in the admin. Use the exact name or slug from the Reference sheet. Colors, Sizes, Brands, Materials, and Occasions are created automatically if missing.',
      },
      {
        topic: 'Status',
        explanation:
          'draft = saved but not visible. active = live on storefront. You can also "Publish immediately" in the upload dialog.',
      },
      {
        topic: 'Visibility',
        explanation:
          'public = visible everywhere. hidden = not shown. catalog_only = shown in catalog but not in search.',
      },
      {
        topic: 'Common mistakes',
        explanation:
          '1) Misspelling the Category name (check Reference sheet). 2) Putting a sale price higher than the selling price. 3) Non-https image URLs. 4) Different product names for the same product (check spelling and whitespace).',
      },
      {
        topic: 'CSV support',
        explanation:
          'You can also upload a .csv file instead of .xlsx. The same column names apply. Use comma as separator.',
      },
      {
        topic: 'Export & re-import',
        explanation:
          'You can export existing products from Admin → Products → Export Products. The export uses the same column format so you can edit and re-import.',
      },
    ];

    for (const instr of instructionRows) {
      const r = instructions.addRow(instr);
      r.getCell('explanation').alignment = { wrapText: true };
    }
    instructions.getRow(1).height = 22;

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /** Single-sheet CSV template (headers + sample rows). */
  buildCsvTemplate(): string {
    const headers = IMPORT_COLUMNS.map((c) => `"${c.label}"`).join(',');
    const sampleImage1 = 'shirt-black-front.jpg';
    const sampleName = `Bulk Template Sample Top`;

    const row1Values: Record<string, string | number> = {
      'Product Name': sampleName,
      Handle: '',
      'Short Description': 'Soft ruffle crop top',
      Description: 'Replace these rows with your real catalogue.',
      Status: 'draft',
      Visibility: 'public',
      Category: 'Crop tops',
      Gender: 'women',
      Brand: OFFICIAL_BRAND_NAME,
      Material: 'Cotton',
      Occasions: 'Casual, Party',
      Tags: 'sample',
      'Selling Price': 9999,
      'Sale Price': 7999,
      'Compare Price': 11999,
      Color: 'Hot Pink',
      Size: 'S',
      Stock: 10,
      'Variant SKU': '',
      'Own Listing': 'TRUE',
      'Default Listing': 'TRUE',
      'Homepage Best Seller': 'FALSE',
      'Homepage More To Love': 'FALSE',
      'Homepage Featured': 'FALSE',
      Fit: 'Regular',
      'Fabric Care': 'Machine Wash Cold',
      'Additional Specifications': 'Neckline: Round Neck | Sleeve: Short Sleeve',
      'SEO Title': `${sampleName} | FE`,
      'SEO Description': 'Soft ruffle crop top.',
      Returns: 'yes',
      'Return Policy': '7-day exchange if unused with tags',
      Warranty: 'no',
      'Warranty Details': '',
      'Payment Method': 'both',
      Images: sampleImage1,
      'Display Order': 1,
      'Variant Position': 1,
      'Product Position': 1,
    };
    const row2Values: Record<string, string | number> = {
      'Product Name': sampleName,
      Color: 'Hot Pink',
      Size: 'M',
      'Selling Price': 9999,
      'Sale Price': 7999,
      Stock: 6,
      'Variant Position': 2,
    };

    const toCsvRow = (values: Record<string, string | number>) => {
      return IMPORT_COLUMNS.map((col) => {
        const v = values[col.label] ?? '';
        return `"${String(v).replace(/"/g, '""')}"`;
      }).join(',');
    };

    return `${headers}\n${toCsvRow(row1Values)}\n${toCsvRow(row2Values)}\n`;
  }
}

export const productImportService = new ProductImportService();
