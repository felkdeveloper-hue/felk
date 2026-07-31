import { http, httpClient } from '@/lib/http-client';

/**
 * Products sent per import request.
 * Keep small so reverse-proxy / load-balancer timeouts (often 60s) do not
 * drop the response after the API has already created the products.
 */
export const PRODUCT_IMPORT_BATCH_SIZE = 5;

/** Large ZIPs / image work need a longer client timeout than the default 30s. */
const IMPORT_UPLOAD_TIMEOUT_MS = 15 * 60 * 1000;

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
  /** Pass back on import when an images ZIP was uploaded at preview. */
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

function saveFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export const productImportApi = {
  async downloadTemplate(): Promise<void> {
    const response = await httpClient.get<Blob>('/catalog/products/import/template', {
      responseType: 'blob',
    });
    saveFile(response.data, 'felk-product-import-template.xlsx');
  },

  async downloadTemplateCsv(): Promise<void> {
    const response = await httpClient.get<Blob>('/catalog/products/import/template.csv', {
      responseType: 'blob',
    });
    saveFile(response.data, 'felk-product-import-template.csv');
  },

  async downloadSampleImagesZip(): Promise<void> {
    const response = await httpClient.get<Blob>('/catalog/products/import/sample-images.zip', {
      responseType: 'blob',
    });
    saveFile(response.data, 'felk-product-import-sample-images.zip');
  },

  async preview(file: File, imagesZip?: File | null): Promise<ImportPreview> {
    const form = new FormData();
    form.append('file', file);
    if (imagesZip) form.append('imagesZip', imagesZip);
    return http.post<ImportPreview>('/catalog/products/import/preview', form, {
      timeout: IMPORT_UPLOAD_TIMEOUT_MS,
    });
  },

  async importBatch(
    products: ImportProductInput[],
    publish: boolean,
    options?: { imagesSessionId?: string | null; imagesZip?: File | null },
  ): Promise<{ results: ImportProductResult[] }> {
    const imagesSessionId = options?.imagesSessionId ?? undefined;
    const imagesZip = options?.imagesZip ?? null;

    if (imagesZip) {
      const form = new FormData();
      form.append('products', JSON.stringify(products));
      form.append('publish', publish ? 'true' : 'false');
      if (imagesSessionId) form.append('imagesSessionId', imagesSessionId);
      form.append('imagesZip', imagesZip);
      return http.post<{ results: ImportProductResult[] }>('/catalog/products/import', form, {
        timeout: IMPORT_UPLOAD_TIMEOUT_MS,
      });
    }

    return http.post<{ results: ImportProductResult[] }>(
      '/catalog/products/import',
      {
        products,
        publish,
        ...(imagesSessionId ? { imagesSessionId } : {}),
      },
      { timeout: IMPORT_UPLOAD_TIMEOUT_MS },
    );
  },

  async exportProducts(filters?: Record<string, string>): Promise<void> {
    const qs = filters ? `?${new URLSearchParams(filters).toString()}` : '';
    const response = await httpClient.get<Blob>(`/catalog/products/export${qs}`, {
      responseType: 'blob',
    });
    saveFile(response.data, 'felk-products-export.xlsx');
  },

  /** Generate a downloadable CSV from error / skip results. */
  buildErrorReportCsv(results: ImportProductResult[]): void {
    const failed = results.filter((r) => r.status !== 'created');
    if (!failed.length) return;
    const header = '"Row","Product Name","Status","Reason"';
    const rows = failed.map(
      (r) =>
        `"${r.row}","${r.name.replace(/"/g, '""')}","${r.status}","${(r.message ?? '').replace(/"/g, '""')}"`,
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveFile(blob, 'felk-import-errors.csv');
  },
};
