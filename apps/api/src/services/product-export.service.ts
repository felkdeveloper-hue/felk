/**
 * Export existing products to a re-importable Excel workbook.
 *
 * The Products sheet uses the SAME columns as the import template so an admin
 * can download, edit, and re-upload without any column mapping.
 */
import ExcelJS from 'exceljs';
import {
  BrandModel,
  CategoryModel,
  ColorModel,
  MaterialModel,
  OccasionModel,
  SizeModel,
} from '@/models/master-data.models';
import { InventoryItemModel } from '@/models/inventory.models';
import { ProductMediaModel, ProductModel, ProductVariantModel } from '@/models/product.models';
import { IMPORT_COLUMNS } from '@/services/product-import.service';

interface ExportFilters {
  status?: string;
  q?: string;
  gender?: string;
  categoryId?: string;
  page?: string | number;
  limit?: string | number;
}

type AnyDoc = Record<string, unknown>;

function nameFrom(id: unknown, map: Map<string, string>): string {
  return map.get(String(id ?? '')) ?? '';
}

async function buildIdNameMap(
  model: typeof BrandModel,
  field: 'name' = 'name',
): Promise<Map<string, string>> {
  const rows = await model.find({ isDeleted: false }).select('name').lean();
  const map = new Map<string, string>();
  for (const row of rows) {
    const r = row as AnyDoc;
    map.set(String(r._id), String(r[field] ?? ''));
  }
  return map;
}

async function buildCategoryMap(): Promise<Map<string, string>> {
  const rows = await CategoryModel.find({ isDeleted: false }).select('name').lean();
  const map = new Map<string, string>();
  for (const row of rows) {
    const r = row as AnyDoc;
    map.set(String(r._id), String(r.name ?? ''));
  }
  return map;
}

export class ProductExportService {
  async exportWorkbook(filters: ExportFilters = {}): Promise<Buffer> {
    const limit = Math.min(Number(filters.limit ?? 500), 2000);
    const page = Math.max(Number(filters.page ?? 1), 1);
    const skip = (page - 1) * limit;

    // Build filter
    const query: AnyDoc = { isDeleted: false };
    if (filters.status) query.status = filters.status;
    if (filters.gender) query.gender = filters.gender;
    if (filters.categoryId) {
      query.$or = [{ categoryId: filters.categoryId }, { categoryIds: filters.categoryId }];
    }
    if (filters.q) {
      query.$or = [
        { name: { $regex: filters.q, $options: 'i' } },
        { slug: { $regex: filters.q, $options: 'i' } },
      ];
    }

    const products = await ProductModel.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    if (!products.length) {
      // Return a blank template when nothing to export
      return this.buildEmptyTemplate();
    }

    const productIds = products.map((p) => String((p as AnyDoc)._id));

    // Load all related data in parallel
    const [variants, media, brandMap, categoryMap, colorMap, sizeMap, materialMap, occasionRows] =
      await Promise.all([
        ProductVariantModel.find({ productId: { $in: productIds }, isDeleted: false })
          .sort({ isDefault: -1, displayOrder: 1, createdAt: 1 })
          .lean(),
        ProductMediaModel.find({ productId: { $in: productIds }, isDeleted: false })
          .sort({ priority: 1, createdAt: 1 })
          .lean(),
        buildIdNameMap(BrandModel),
        buildCategoryMap(),
        buildIdNameMap(ColorModel as typeof BrandModel),
        buildIdNameMap(SizeModel as typeof BrandModel),
        buildIdNameMap(MaterialModel as typeof BrandModel),
        OccasionModel.find({ isDeleted: false }).select('name').lean(),
      ]);

    const occasionNameMap = new Map<string, string>();
    for (const row of occasionRows) {
      const r = row as AnyDoc;
      occasionNameMap.set(String(r._id), String(r.name ?? ''));
    }

    // Fetch inventory (stock) for all variants by summing on-hand across warehouses
    const stockMap = new Map<string, number>();
    try {
      const variantIds = variants.map((v) => String((v as AnyDoc)._id));
      if (variantIds.length) {
        const inventoryItems = await InventoryItemModel.find({
          variantId: { $in: variantIds },
          isDeleted: false,
        })
          .select('variantId onHand')
          .lean();
        for (const item of inventoryItems) {
          const it = item as AnyDoc;
          const vid = String(it.variantId);
          stockMap.set(vid, (stockMap.get(vid) ?? 0) + Number(it.onHand ?? 0));
        }
      }
    } catch {
      // Stock unavailable — export with 0
    }

    // Group variants and media by productId
    const variantsByProduct = new Map<string, AnyDoc[]>();
    for (const v of variants) {
      const vr = v as AnyDoc;
      const pid = String(vr.productId);
      if (!variantsByProduct.has(pid)) variantsByProduct.set(pid, []);
      variantsByProduct.get(pid)!.push(vr);
    }

    // Group media by variantId
    const mediaByVariant = new Map<string, AnyDoc[]>();
    for (const m of media) {
      const mr = m as AnyDoc;
      const vid = String(mr.variantId ?? '');
      if (!vid) continue;
      if (!mediaByVariant.has(vid)) mediaByVariant.set(vid, []);
      mediaByVariant.get(vid)!.push(mr);
    }

    // Build workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'FE Admin';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Products');
    sheet.columns = IMPORT_COLUMNS.map((col) => ({
      header: col.label,
      key: col.key,
      width: Math.max(16, Math.min(40, col.label.length + 12)),
    }));
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A1A2E' } };
    headerRow.alignment = { vertical: 'middle' };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];

    let productPosition = 0;
    for (const product of products) {
      const p = product as AnyDoc;
      const productId = String(p._id);
      productPosition += 1;

      const productVariants = variantsByProduct.get(productId) ?? [];
      const categoryName = nameFrom(p.categoryId, categoryMap);
      const brandName = nameFrom(p.brandId, brandMap);
      const materialName = nameFrom(p.materialId, materialMap);

      const occasionIds = Array.isArray(p.occasionIds) ? p.occasionIds : [];
      const occasionsStr = occasionIds
        .map((id) => occasionNameMap.get(String(id)) ?? '')
        .filter(Boolean)
        .join(', ');

      const tagsStr = Array.isArray(p.tags) ? (p.tags as string[]).join(', ') : '';

      // Parse specifications
      const specRows = Array.isArray(p.specifications) ? (p.specifications as AnyDoc[]) : [];
      const fitSpec = specRows.find((s) => String(s.name ?? '').toLowerCase() === 'fit');
      const careSpec = specRows.find(
        (s) =>
          String(s.name ?? '')
            .toLowerCase()
            .includes('fabric care') ||
          String(s.name ?? '')
            .toLowerCase()
            .includes('wash care'),
      );
      const additionalSpecs = specRows
        .filter((s) => s !== fitSpec && s !== careSpec)
        .map((s) => `${s.name}: ${s.value}`)
        .join(' | ');

      const seo = (p.seo as AnyDoc | undefined) ?? {};
      const pricing = (p.pricing as AnyDoc | undefined) ?? {};

      // Find the "default" variant for product-level pricing
      const defaultVariant =
        productVariants.find((v) => Boolean(v.isDefault)) ?? productVariants[0];

      // Track images already written per color to avoid repeats
      const colorImagesWritten = new Map<string, boolean>();

      let variantPosition = 0;
      for (const [vIndex, variant] of productVariants.entries()) {
        const v = variant as AnyDoc;
        const variantId = String(v._id);
        variantPosition += 1;

        const colorName = nameFrom(v.colorId, colorMap);
        const sizeName = nameFrom(v.sizeId, sizeMap);
        const stock = stockMap.get(variantId) ?? 0;

        // Images for this variant
        const variantMedia = mediaByVariant.get(variantId) ?? [];
        const colorKey = colorName.toLowerCase() || '__nocolor__';
        let imagesStr = '';
        if (!colorImagesWritten.has(colorKey)) {
          colorImagesWritten.set(colorKey, true);
          imagesStr = variantMedia.map((m) => String((m as AnyDoc).url ?? '')).join(', ');
        }

        const isFirst = vIndex === 0;

        sheet.addRow({
          name: String(p.name ?? ''),
          handle: String(p.slug ?? ''),
          shortDescription: isFirst ? String(p.shortDescription ?? '') : '',
          description: isFirst ? String(p.description ?? '') : '',
          status: isFirst ? String(p.status ?? 'draft') : '',
          visibility: isFirst ? String(p.visibility ?? 'public') : '',
          category: isFirst ? categoryName : '',
          gender: isFirst ? String(p.gender ?? '') : '',
          brand: isFirst ? brandName : '',
          material: isFirst ? materialName : '',
          occasions: isFirst ? occasionsStr : '',
          tags: isFirst ? tagsStr : '',
          price: Number(v.price ?? defaultVariant?.price ?? pricing.price ?? 0),
          salePrice: v.salePrice ? Number(v.salePrice) : '',
          comparePrice: v.compareAtPrice ? Number(v.compareAtPrice) : '',
          color: colorName,
          size: sizeName,
          stock,
          sku: String(v.sku ?? ''),
          ownListing: Boolean(v.listSeparately) ? 'TRUE' : 'FALSE',
          defaultListing: Boolean(v.isDefault) ? 'TRUE' : 'FALSE',
          isBestSeller: isFirst && Boolean(p.isBestSeller) ? 'TRUE' : 'FALSE',
          isMoreToLove: isFirst && Boolean(p.isMoreToLove) ? 'TRUE' : 'FALSE',
          isFeatured: isFirst && Boolean(p.isFeatured) ? 'TRUE' : 'FALSE',
          fit: isFirst ? String(fitSpec?.value ?? '') : '',
          fabricCare: isFirst ? String(careSpec?.value ?? '') : '',
          specifications: isFirst ? additionalSpecs : '',
          seoTitle: isFirst ? String(seo.title ?? '') : '',
          seoDescription: isFirst ? String(seo.description ?? '') : '',
          returns: isFirst ? (Boolean(p.returnsAvailable) ? 'yes' : 'no') : '',
          returnPolicy: isFirst ? String(p.returnsCriteria ?? '') : '',
          warranty: isFirst ? (Boolean(p.warrantyAvailable) ? 'yes' : 'no') : '',
          warrantyDetails: isFirst ? String(p.warrantyDetails ?? '') : '',
          paymentMethod: isFirst ? String(p.paymentOption ?? 'both') : '',
          images: imagesStr,
          displayOrder: Number(v.displayOrder ?? vIndex),
          variantPosition,
          productPosition: isFirst ? productPosition : '',
        });
      }

      // If product has no variants, write a placeholder row so the product isn't lost
      if (!productVariants.length) {
        const pricing = (p.pricing as AnyDoc | undefined) ?? {};
        sheet.addRow({
          name: String(p.name ?? ''),
          handle: String(p.slug ?? ''),
          shortDescription: String(p.shortDescription ?? ''),
          description: String(p.description ?? ''),
          status: String(p.status ?? 'draft'),
          visibility: String(p.visibility ?? 'public'),
          category: categoryName,
          gender: String(p.gender ?? ''),
          brand: brandName,
          material: materialName,
          occasions: occasionsStr,
          tags: tagsStr,
          price: Number(pricing.price ?? 0),
          salePrice: pricing.salePrice ? Number(pricing.salePrice) : '',
          comparePrice: pricing.compareAtPrice ? Number(pricing.compareAtPrice) : '',
          fit: String(fitSpec?.value ?? ''),
          fabricCare: String(careSpec?.value ?? ''),
          specifications: additionalSpecs,
          seoTitle: String(seo.title ?? ''),
          seoDescription: String(seo.description ?? ''),
          returns: Boolean(p.returnsAvailable) ? 'yes' : 'no',
          returnPolicy: String(p.returnsCriteria ?? ''),
          warranty: Boolean(p.warrantyAvailable) ? 'yes' : 'no',
          warrantyDetails: String(p.warrantyDetails ?? ''),
          paymentMethod: String(p.paymentOption ?? 'both'),
          isBestSeller: Boolean(p.isBestSeller) ? 'TRUE' : 'FALSE',
          isMoreToLove: Boolean(p.isMoreToLove) ? 'TRUE' : 'FALSE',
          isFeatured: Boolean(p.isFeatured) ? 'TRUE' : 'FALSE',
          productPosition,
        });
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  private async buildEmptyTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Products');
    sheet.columns = IMPORT_COLUMNS.map((col) => ({
      header: col.label,
      key: col.key,
      width: Math.max(16, Math.min(40, col.label.length + 12)),
    }));
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A1A2E' } };
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}

export const productExportService = new ProductExportService();
