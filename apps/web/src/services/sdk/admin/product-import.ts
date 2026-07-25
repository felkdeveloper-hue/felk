import { http, httpClient } from '@/lib/http-client';

/** Products sent per import request — must match the API batch limit. */
export const PRODUCT_IMPORT_BATCH_SIZE = 25;

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
  specifications: Array<{ name: string; value: string; sortOrder: number }>;
  seoTitle: string;
  seoDescription: string;
  paymentOption: 'cod' | 'prepaid' | 'both';
  returnsAvailable: boolean;
  returnsCriteria: string;
  warrantyAvailable: boolean;
  warrantyDetails: string;
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
  /** Downloads the Excel template, pre-filled with the store's own categories. */
  async downloadTemplate(): Promise<void> {
    const response = await httpClient.get<Blob>('/catalog/products/import/template', {
      responseType: 'blob',
    });
    saveFile(response.data, 'felk-product-import-template.xlsx');
  },

  /** Validates a sheet and reports what would be created. Writes nothing. */
  async preview(file: File): Promise<ImportPreview> {
    const form = new FormData();
    form.append('file', file);
    return http.post<ImportPreview>('/catalog/products/import/preview', form);
  },

  async importBatch(
    products: ImportProductInput[],
    publish: boolean,
  ): Promise<{ results: ImportProductResult[] }> {
    return http.post<{ results: ImportProductResult[] }>('/catalog/products/import', {
      products,
      publish,
    });
  },
};
