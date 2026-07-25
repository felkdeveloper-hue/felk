/**
 * Bulk product import from an Excel / CSV sheet.
 *
 * The sheet is variant-per-row: every row is one colour + size combination and
 * consecutive rows that share a product name (or handle) are folded into a
 * single product. Parsing and validation are separated from writing so the
 * admin can preview exactly what will happen before anything is created.
 */
import ExcelJS from 'exceljs';
import { PRODUCT_IMPORT_BATCH_LIMIT, PRODUCT_STATUS } from '@/constants/product';
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
import { productMediaService } from '@/services/product-media.service';
import { productService } from '@/services/product.service';
import { productVariantService } from '@/services/product-variant.service';
import { ApiError } from '@/utils/errors/api-error';
import { slugify } from '@/utils/slug.helper';

/* -------------------------------------------------------------------------- */
/* Sheet contract                                                             */
/* -------------------------------------------------------------------------- */

export type ImportColumnKey =
  | 'name'
  | 'handle'
  | 'category'
  | 'gender'
  | 'brand'
  | 'material'
  | 'occasions'
  | 'tags'
  | 'shortDescription'
  | 'description'
  | 'status'
  | 'color'
  | 'size'
  | 'price'
  | 'salePrice'
  | 'stock'
  | 'sku'
  | 'images';

interface ColumnDef {
  key: ImportColumnKey;
  label: string;
  aliases: string[];
  required: boolean;
  help: string;
  example: string;
}

export const IMPORT_COLUMNS: ColumnDef[] = [
  {
    key: 'name',
    label: 'Product Name',
    aliases: ['product', 'title', 'productname'],
    required: true,
    help: 'Repeat the same name on every row that belongs to the same product.',
    example: "Women's Ruffle Sleeve Crop Top",
  },
  {
    key: 'category',
    label: 'Category',
    aliases: ['categoryname', 'categoryslug'],
    required: true,
    help: 'Must already exist. Use the name or the slug exactly as in the Reference sheet.',
    example: 'Crop tops',
  },
  {
    key: 'color',
    label: 'Color',
    aliases: ['colour', 'variantcolor', 'variantcolour'],
    required: false,
    help: 'One row per colour + size. Created automatically if it does not exist.',
    example: 'Hot Pink',
  },
  {
    key: 'size',
    label: 'Size',
    aliases: ['variantsize'],
    required: false,
    help: 'Created automatically if it does not exist. Leave blank for one-size products.',
    example: 'S',
  },
  {
    key: 'price',
    label: 'Price',
    aliases: ['mrp', 'regularprice', 'variantprice'],
    required: true,
    help: 'Numbers only, in LKR. Example: 9999',
    example: '9999',
  },
  {
    key: 'salePrice',
    label: 'Sale Price',
    aliases: ['discountprice', 'discountedprice', 'offerprice'],
    required: false,
    help: 'Optional. Must be lower than or equal to Price.',
    example: '7999',
  },
  {
    key: 'stock',
    label: 'Stock',
    aliases: ['quantity', 'qty', 'stockquantity', 'inventory'],
    required: false,
    help: 'Whole number of units available for this colour + size.',
    example: '10',
  },
  {
    key: 'sku',
    label: 'SKU',
    aliases: ['variantsku', 'code'],
    required: false,
    help: 'Optional. Generated automatically when left blank.',
    example: '',
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
    help: 'Created automatically if it does not exist.',
    example: '',
  },
  {
    key: 'material',
    label: 'Material',
    aliases: ['fabric'],
    required: false,
    help: 'Created automatically if it does not exist.',
    example: 'Cotton',
  },
  {
    key: 'occasions',
    label: 'Occasions',
    aliases: ['occasion'],
    required: false,
    help: 'Separate multiple values with commas.',
    example: 'Party, Casual',
  },
  {
    key: 'tags',
    label: 'Tags',
    aliases: ['tag', 'keywords'],
    required: false,
    help: 'Separate multiple values with commas.',
    example: 'new, summer',
  },
  {
    key: 'shortDescription',
    label: 'Short Description',
    aliases: ['shortdesc', 'summary'],
    required: false,
    help: 'One line shown in listings.',
    example: 'Ruffle sleeve crop top',
  },
  {
    key: 'description',
    label: 'Description',
    aliases: ['longdescription', 'details', 'fulldescription'],
    required: false,
    help: 'Full product description.',
    example: '',
  },
  {
    key: 'status',
    label: 'Status',
    aliases: ['productstatus', 'publishstatus'],
    required: false,
    help: 'draft or active. Defaults to draft so you can review before going live.',
    example: 'draft',
  },
  {
    key: 'images',
    label: 'Image URLs',
    aliases: ['image', 'images', 'imageurl', 'photo', 'photos', 'imagelinks'],
    required: false,
    help: 'Full https links, separated by commas. Images attach to this row\u2019s colour.',
    example: '',
  },
  {
    key: 'handle',
    label: 'Handle',
    aliases: ['slug', 'producthandle', 'group'],
    required: false,
    help: 'Optional grouping key / URL slug. Defaults to the product name.',
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
  stock: number | null;
  sku: string;
  images: string[];
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
  status: string;
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
    .split(/[,;|\n]/)
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

/* -------------------------------------------------------------------------- */
/* Sheet -> rows                                                              */
/* -------------------------------------------------------------------------- */

type RawRow = { row: number; values: Partial<Record<ImportColumnKey, string>> };

async function readSheet(file: Express.Multer.File): Promise<string[][]> {
  const isCsv =
    file.mimetype === 'text/csv' ||
    file.mimetype === 'application/csv' ||
    /\.csv$/i.test(file.originalname ?? '');

  if (isCsv) return parseCsv(file.buffer.toString('utf8'));

  const workbook = new ExcelJS.Workbook();
  try {
    // ExcelJS ships its own Buffer typing, which no longer lines up with @types/node.
    await workbook.xlsx.load(file.buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
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
    // Spreadsheet row numbers are 1-based and include the header row.
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

function buildProducts(rows: RawRow[]): { products: ImportProductInput[]; issues: ImportIssue[] } {
  const issues: ImportIssue[] = [];
  const products = new Map<string, ImportProductInput>();
  const seenVariants = new Map<string, Set<string>>();
  const usedSlugs = new Map<string, string>();

  for (const { row, values } of rows) {
    const name = values.name ?? '';
    if (!name) {
      issues.push({ row, column: 'Product Name', message: 'Product name is required.' });
      continue;
    }

    const handle = normalizeKey(values.handle ?? name);
    const price = parseMoney(values.price ?? '');
    if (price === null) {
      issues.push({ row, column: 'Price', message: 'Price is required and must be a number.' });
      continue;
    }
    if (price <= 0) {
      issues.push({ row, column: 'Price', message: 'Price must be greater than 0.' });
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
        message: `Sale price ${salePrice} cannot be higher than price ${price}.`,
      });
      continue;
    }

    const stockRaw = values.stock ?? '';
    const stock = stockRaw ? parseWholeNumber(stockRaw) : null;
    if (stockRaw && (stock === null || stock < 0)) {
      issues.push({ row, column: 'Stock', message: 'Stock must be a whole number of 0 or more.' });
      continue;
    }

    const images = splitList(values.images ?? '');
    const badImage = images.find((url) => !isHttpUrl(url));
    if (badImage) {
      issues.push({
        row,
        column: 'Image URLs',
        message: `"${badImage}" is not a full link. Use an address starting with https://`,
      });
      continue;
    }

    let existing = products.get(handle);
    if (!existing) {
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
        brand: values.brand ?? '',
        material: values.material ?? '',
        occasions: splitList(values.occasions ?? ''),
        tags: splitList(values.tags ?? ''),
        shortDescription: values.shortDescription ?? '',
        description: values.description ?? '',
        status,
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

    existing.rows.push(row);
    existing.variants.push({
      row,
      color,
      size,
      price,
      salePrice,
      stock,
      sku: values.sku ?? '',
      images,
    });
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

/** Creates a lookup row on demand, keeping `code`/`slug` unique. */
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
  async preview(file: Express.Multer.File): Promise<ImportPreview> {
    const grid = await readSheet(file);
    const { rows } = toRawRows(grid);
    const { products, issues } = buildProducts(rows);

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

    const slugs = products.map((product) => product.slug);
    const existing = slugs.length
      ? await ProductModel.find({ slug: { $in: slugs }, isDeleted: false })
          .select('slug')
          .lean()
      : [];
    const duplicates = new Set(existing.map((row) => String(row.slug)));

    const variants = products.reduce((total, product) => total + product.variants.length, 0);
    const stockUnits = products.reduce(
      (total, product) =>
        total + product.variants.reduce((sum, variant) => sum + (variant.stock ?? 0), 0),
      0,
    );
    const images = products.reduce(
      (total, product) =>
        total + product.variants.reduce((sum, variant) => sum + variant.images.length, 0),
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
    };
  }

  /**
   * Create one batch of previously validated products. Each product is
   * independent so a single bad row cannot abort the whole upload.
   */
  async importProducts(
    products: ImportProductInput[],
    actor: ActorMeta,
    options: { publish?: boolean } = {},
  ): Promise<{ results: ImportProductResult[] }> {
    if (products.length > PRODUCT_IMPORT_BATCH_LIMIT) {
      throw ApiError.badRequest(
        `Import at most ${PRODUCT_IMPORT_BATCH_LIMIT} products per request.`,
        undefined,
        'IMPORT_BATCH_TOO_LARGE',
      );
    }

    const lookups = await buildLookups();
    const results: ImportProductResult[] = [];

    for (const product of products) {
      const row = product.rows[0] ?? 0;
      try {
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

        const duplicate = await ProductModel.exists({ slug: product.slug, isDeleted: false });
        if (duplicate) {
          results.push({
            handle: product.handle,
            name: product.name,
            row,
            status: 'skipped',
            message: 'A product with this web address already exists.',
          });
          continue;
        }

        const [brandId, materialId] = await Promise.all([
          product.brand ? lookups.brands.ensure(product.brand) : Promise.resolve(undefined),
          product.material
            ? lookups.materials.ensure(product.material)
            : Promise.resolve(undefined),
        ]);
        const occasionIds: string[] = [];
        for (const occasion of product.occasions) {
          occasionIds.push(await lookups.occasions.ensure(occasion));
        }

        const prices = product.variants.map((variant) => variant.price);
        const basePrice = prices.length ? Math.min(...prices) : 0;
        const baseVariant = product.variants.find((variant) => variant.price === basePrice);

        const created = await productService.create(
          {
            name: product.name,
            slug: product.slug,
            shortDescription: product.shortDescription || undefined,
            description: product.description || undefined,
            categoryId,
            categoryIds: [categoryId],
            brandId,
            materialId,
            occasionIds,
            gender: product.gender || undefined,
            tags: product.tags,
            status: options.publish ? PRODUCT_STATUS.ACTIVE : product.status,
            price: basePrice,
            salePrice: baseVariant?.salePrice ?? undefined,
            currency: 'LKR',
          },
          actor,
        );

        const productId = String(created._id);
        let primaryAssigned = false;

        for (const [index, variant] of product.variants.entries()) {
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
              salePrice: variant.salePrice,
              currency: 'LKR',
              sku: variant.sku || undefined,
              displayOrder: index,
              isDefault: index === 0,
            },
            actor,
          );

          const variantId = String(createdVariant._id);

          if (variant.stock && variant.stock > 0) {
            await inventoryService.setStockQuantity({ variantId, quantity: variant.stock }, actor);
          }

          for (const [imageIndex, url] of variant.images.entries()) {
            await productMediaService.createRemote(
              productId,
              {
                url,
                variantId,
                alt: title,
                priority: index * 10 + imageIndex,
                isPrimary: !primaryAssigned,
                isGallery: true,
              },
              actor,
            );
            primaryAssigned = true;
          }
        }

        results.push({
          handle: product.handle,
          name: product.name,
          row,
          status: 'created',
          productId,
          variants: product.variants.length,
        });
      } catch (error) {
        results.push({
          handle: product.handle,
          name: product.name,
          row,
          status: 'failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return { results };
  }

  /** Workbook with the expected columns, examples and the owner's own reference data. */
  async buildTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'FE Admin';
    workbook.created = new Date();

    const guide = workbook.addWorksheet('How to use');
    guide.columns = [
      { header: 'Column', key: 'column', width: 22 },
      { header: 'Required', key: 'required', width: 12 },
      { header: 'What to enter', key: 'help', width: 78 },
    ];
    guide.getRow(1).font = { bold: true };
    for (const column of IMPORT_COLUMNS) {
      guide.addRow({
        column: column.label,
        required: column.required ? 'Yes' : 'Optional',
        help: column.help,
      });
    }
    guide.addRow({});
    guide.addRow({
      column: 'One row = one size',
      help: 'Repeat the product name on each row. Rows sharing a name become one product with many colours and sizes.',
    });
    guide.addRow({
      column: 'Categories',
      help: 'Categories must already exist — see the Reference sheet. Colours, sizes, brands and materials are created for you.',
    });

    const sheet = workbook.addWorksheet('Products');
    sheet.columns = IMPORT_COLUMNS.map((column) => ({
      header: column.label,
      key: column.key,
      width: Math.max(14, Math.min(38, column.label.length + 10)),
    }));
    const header = sheet.getRow(1);
    header.font = { bold: true };
    header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F1F1' } };
    header.alignment = { vertical: 'middle' };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];

    const [category] = await CategoryModel.find({ isDeleted: false, status: 'active' })
      .select('name')
      .limit(1)
      .lean();
    const exampleCategory = (category as { name?: string } | undefined)?.name ?? 'Crop tops';

    sheet.addRow({
      name: "Women's Ruffle Sleeve Crop Top",
      category: exampleCategory,
      color: 'Hot Pink',
      size: 'S',
      price: 9999,
      salePrice: 7999,
      stock: 10,
      gender: 'women',
      material: 'Cotton',
      status: 'draft',
    });
    sheet.addRow({
      name: "Women's Ruffle Sleeve Crop Top",
      category: exampleCategory,
      color: 'Hot Pink',
      size: 'M',
      price: 9999,
      salePrice: 7999,
      stock: 6,
    });
    sheet.addRow({
      name: "Women's Ruffle Sleeve Crop Top",
      category: exampleCategory,
      color: 'Olive',
      size: 'S',
      price: 9999,
      stock: 4,
    });

    const reference = workbook.addWorksheet('Reference');
    reference.columns = [
      { header: 'Categories (use these)', key: 'category', width: 34 },
      { header: 'Category slug', key: 'categorySlug', width: 30 },
      { header: 'Existing colours', key: 'color', width: 24 },
      { header: 'Existing sizes', key: 'size', width: 18 },
      { header: 'Existing brands', key: 'brand', width: 24 },
    ];
    reference.getRow(1).font = { bold: true };

    const [categories, colors, sizes, brands] = await Promise.all([
      CategoryModel.find({ isDeleted: false, status: 'active' })
        .select('name slug')
        .sort({ name: 1 })
        .lean(),
      ColorModel.find({ isDeleted: false }).select('name').sort({ name: 1 }).lean(),
      SizeModel.find({ isDeleted: false }).select('name').sort({ name: 1 }).lean(),
      BrandModel.find({ isDeleted: false }).select('name').sort({ name: 1 }).lean(),
    ]);

    const nameOf = (row: unknown) => String((row as { name?: string })?.name ?? '');
    const rowCount = Math.max(categories.length, colors.length, sizes.length, brands.length);
    for (let index = 0; index < rowCount; index += 1) {
      reference.addRow({
        category: nameOf(categories[index]),
        categorySlug: String((categories[index] as { slug?: string } | undefined)?.slug ?? ''),
        color: nameOf(colors[index]),
        size: nameOf(sizes[index]),
        brand: nameOf(brands[index]),
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}

export const productImportService = new ProductImportService();
